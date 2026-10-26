import type { CodingAction } from './actions.ts'

/** Visual-only groups. One action ID may be referenced by several groups. */
export const LAUNCHER_GROUPS = [
  { id: 'development', label: 'groupDevelopment', actionIds: ['discussion', 'visual', 'spec', 'plan', 'execute', 'review', 'review-fix', 'compile', 'health-acceptance', 'commit', 'doc-supplement'] },
  { id: 'documents', label: 'groupDocuments', actionIds: ['api-docs', 'requirements', 'overview', 'outline', 'database', 'doc-merge', 'docx'] },
  { id: 'others', label: 'groupOthers', actionIds: ['initialize', 'ask', 'health-acceptance', 'doc-supplement', 'tdd', 'prototype', 'architecture', 'domain', 'research', 'retro', 'handoff', 'image'] },
] as const

export type OptionalGroupId = typeof LAUNCHER_GROUPS[number]['id']
export const DEFAULT_COMMON_IDS = ['bug', 'discussion', 'execute', 'review', 'review-fix', 'compile', 'commit', 'continue'] as const
const LEGACY_DEFAULT_PINNED = ['discussion', 'spec', 'execute', 'bug', 'review', 'health-acceptance', 'doc-supplement', 'commit', 'review-fix', 'compile']

export interface LauncherLayout {
  schemaVersion: 1
  visibleGroups: Record<OptionalGroupId, boolean>
  commonActionIds: string[]
}

const defaultVisibility: Record<OptionalGroupId, boolean> = {
  development: true, documents: false, others: false,
}
const actionIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/

export function defaultLauncherLayout(actions: readonly CodingAction[], hasSavedActions = false): LauncherLayout {
  const pinned = actions.filter(a => a.pinned).map(a => a.id)
  const legacyDefaults = pinned.length === LEGACY_DEFAULT_PINNED.length &&
    LEGACY_DEFAULT_PINNED.every(id => pinned.includes(id))
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
  if (LAUNCHER_GROUPS.some(group => typeof obj[group.id] !== 'boolean') ||
    ids.some(id => typeof id !== 'string' || !actionIdPattern.test(id)) ||
    new Set(ids).size !== ids.length) throw new Error('分组布局选项或按钮 ID 错误')
  return {
    schemaVersion: 1,
    visibleGroups: {
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
