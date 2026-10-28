import type { CodingAction } from './actions.ts'

/** Visual-only groups. One action ID may be referenced by several groups. */
export const LAUNCHER_GROUPS = [
  { id: 'requirements-analysis', label: 'groupRequirementsAnalysis', actionIds: ['product-development-pipeline', 'requirement-clarification', 'requirement-analysis', 'product-risk-gate', 'solution-design', 'product-module-gate', 'product-state-gate', 'product-exception-gate', 'product-prd-pages', 'product-consistency-gate', 'product-image-prompt'] },
  { id: 'development', label: 'groupDevelopment', actionIds: ['discussion', 'visual', 'spec', 'plan', 'execute', 'add-logs', 'analyze-logs', 'review', 'review-fix', 'compile', 'health-acceptance', 'commit', 'doc-supplement', 'remote-debug'] },
  { id: 'documents', label: 'groupDocuments', actionIds: ['api-docs', 'requirements', 'overview', 'outline', 'database', 'doc-merge', 'docx'] },
  { id: 'others', label: 'groupOthers', actionIds: ['initialize', 'ask', 'health-acceptance', 'doc-supplement', 'tdd', 'prototype', 'architecture', 'domain', 'research', 'retro', 'handoff', 'image', 'prd-writing', 'requirement-review'] },
] as const

export type OptionalGroupId = typeof LAUNCHER_GROUPS[number]['id']
export type GroupId = 'common' | OptionalGroupId
export const DEFAULT_COMMON_IDS = ['bug', 'add-logs', 'analyze-logs', 'discussion', 'execute', 'review', 'review-fix', 'compile', 'commit', 'continue', 'remote-debug'] as const
const LEGACY_DEFAULT_PINNED = ['discussion', 'spec', 'execute', 'bug', 'review', 'health-acceptance', 'doc-supplement', 'commit', 'review-fix', 'compile']

export interface LauncherLayout {
  schemaVersion: 1
  visibleGroups: Record<GroupId, boolean>
  commonActionIds: string[]
}

const defaultVisibility: Record<GroupId, boolean> = {
  common: true, 'requirements-analysis': true, development: true, documents: false, others: false,
}
const actionIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/

export function defaultLauncherLayout(actions: readonly CodingAction[], hasSavedActions = false): LauncherLayout {
  const pinned = actions.filter(a => a.pinned).map(a => a.id)
  const presetPinned = pinned.filter(id => !['add-logs', 'analyze-logs', 'remote-debug'].includes(id))
  const legacyDefaults = presetPinned.length === LEGACY_DEFAULT_PINNED.length &&
    LEGACY_DEFAULT_PINNED.every(id => presetPinned.includes(id))
  // Preserve explicitly customized old pinned lists, except the original preset.
  const commonActionIds = hasSavedActions && !legacyDefaults
    ? pinned
    : [...DEFAULT_COMMON_IDS]
  return { schemaVersion: 1, visibleGroups: { ...defaultVisibility }, commonActionIds }
}

/** Reject damaged saved layout instead of silently losing user preferences. */
export function parseLauncherLayout(
  source: string | undefined,
  actions: readonly CodingAction[],
  hasSavedActions = false,
): LauncherLayout {
  if (!source) return defaultLauncherLayout(actions, hasSavedActions)
  let parsed: unknown
  try { parsed = JSON.parse(source) } catch { throw new Error('分组布局 JSON 格式错误') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('分组布局结构错误')
  const doc = parsed as Record<string, unknown>
  const visible = doc.visibleGroups
  const ids = doc.commonActionIds
  if (doc.schemaVersion !== 1 || !visible || typeof visible !== 'object' || Array.isArray(visible) ||
    !Array.isArray(ids) || ids.length > 100) throw new Error('分组布局版本或字段错误')
  const obj = visible as Record<string, unknown>
  if ((obj.common !== undefined && typeof obj.common !== 'boolean') ||
    (obj['requirements-analysis'] !== undefined && typeof obj['requirements-analysis'] !== 'boolean') ||
    LAUNCHER_GROUPS.some(group => group.id !== 'requirements-analysis' && typeof obj[group.id] !== 'boolean') ||
    ids.some(id => typeof id !== 'string' || !actionIdPattern.test(id)) ||
    new Set(ids).size !== ids.length) throw new Error('分组布局选项或按钮 ID 错误')
  return {
    schemaVersion: 1,
    visibleGroups: {
      common: obj.common === undefined ? true : obj.common as boolean,
      'requirements-analysis': obj['requirements-analysis'] === undefined ? false : obj['requirements-analysis'] as boolean,
      development: obj.development as boolean,
      documents: obj.documents as boolean,
      others: obj.others as boolean,
    },
    commonActionIds: ids as string[],
  }
}

export function actionsForGroup(
  groupId: 'common' | OptionalGroupId,
  enabled: readonly CodingAction[],
  layout: LauncherLayout,
): CodingAction[] {
  const available = new Map(enabled.filter(a => a.enabled).map(a => [a.id, a]))
  const ids: readonly string[] = groupId === 'common'
    ? layout.commonActionIds
    : LAUNCHER_GROUPS.find(group => group.id === groupId)?.actionIds ?? []
  const ordered = ids.flatMap(id => {
    const action = available.get(id)
    return action ? [action] : []
  })
  if (groupId !== 'others') return ordered
  // Never strand custom/legacy actions after replacing the old More drawer.
  const known = new Set<string>([
    ...DEFAULT_COMMON_IDS,
    ...LAUNCHER_GROUPS.flatMap(group => [...group.actionIds]),
  ])
  return [...ordered, ...enabled.filter(a => a.enabled && !known.has(a.id))
    .sort((a, b) => a.order - b.order)]
}

/** Export the full layout while keeping the v3 action document importable by older clients. */
export function exportLauncherConfiguration(actionsDocument: string, layout: LauncherLayout): string {
  const doc = JSON.parse(actionsDocument) as Record<string, unknown>
  return JSON.stringify({ ...doc, launcherLayout: layout }, null, 2)
}

export function importedLauncherLayout(
  source: string,
  actions: readonly CodingAction[],
  fallback: LauncherLayout,
): LauncherLayout {
  const doc = JSON.parse(source) as { launcherLayout?: unknown }
  return doc && doc.launcherLayout !== undefined
    ? parseLauncherLayout(JSON.stringify(doc.launcherLayout), actions, true)
    : fallback
}
