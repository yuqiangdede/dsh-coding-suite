import { useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { parseActions, actionErrorKey, presentDefaultActions, displayOrder, type CodingAction } from './actions.ts'
import type { LauncherInjected } from './index.ts'
import { chatEntries, recommend, withEvidence } from './contextual-actions.ts'
import { WorkflowPanel } from './WorkflowPanel.tsx'
import { LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout, parseLauncherLayout, type OptionalGroupId } from './launcher-layout.ts'
import css from './Launcher.module.css'
type Props = PropsRuntime<'conversation.input.dock'> & PropsLocale<'mattSkillLauncher'> & InjectFace<LauncherInjected>
export function Launcher({
  useInput, useConversation, useSession, useProjection, inputActions, useActionForm, fetchSkillNames,
  useWorkflow, workflowCommands, saveLayout, todoStaleMs, t,
}: Props) {
  const snapshot = useActionForm(x => x)
  const input = useInput(x => x)
  const chat = useConversation(x => x.views.get('chat'))
  const sessionRunning = useSession(x => x.running)
  const workflow = useWorkflow(x => x)
  const todos = useProjection('todos')
  const planSignature = JSON.stringify(todos ?? [])
  const planOpen = todos?.some(todo => todo.status !== 'completed') ?? false
  const watching = sessionRunning && planOpen
  // Age is measured at render from the signature's own timestamp, so a changed
  // plan never paints the previous plan's warning and a remount cannot inherit
  // a stale age. The interval only schedules the next render.
  const planChangedAt = useMemo(() => Date.now(), [planSignature])
  const [, setTick] = useState(0)
  const tickMs = Math.max(1000, Math.floor(todoStaleMs / 6))
  useEffect(() => {
    if (!watching) return
    const timer = setInterval(() => { setTick(tick => tick + 1) }, tickMs)
    return () => { clearInterval(timer) }
  }, [watching, tickMs])
  const unchangedMs = Date.now() - planChangedAt
  const planMayBeStale = watching && unchangedMs >= todoStaleMs
  const unchangedMinutes = Math.ceil(unchangedMs / 60000)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const explain = (error: unknown) => {
    const key = actionErrorKey(error)
    return key ? t(key) : String(error)
  }
  let actions: CodingAction[] = []
  let invalid = ''
  try { actions = parseActions(snapshot.value?.actionsJson) } catch (error) { invalid = explain(error) }
  actions = snapshot.value?.actionsJson ? actions : presentDefaultActions(actions, t('defaultLocale') === 'en')
  let layout = defaultLauncherLayout(actions)
  try { layout = parseLauncherLayout(snapshot.value?.layoutJson, actions, Boolean(snapshot.value?.actionsJson)) }
  catch (error) { invalid = explain(error) }
  const enabledActions = actions.filter(a => a.enabled).sort((a, b) => displayOrder(a) - displayOrder(b))
  // Buttons travel with their own prompt, so the request can be attributed by id
  // instead of guessing the stage from keywords inside that prompt.
  const entries = sessionRunning ? [] : chatEntries(chat)
  const recommendation = recommend(entries, sessionRunning, enabledActions)
  const recommendedActions = recommendation
    ? enabledActions.filter(action => recommendation.ids.includes(action.id))
    : []
  const visibleRecommendation = recommendedActions.length ? recommendation : null
  const commonActions = actionsForGroup('common', enabledActions, layout)
  const groups = LAUNCHER_GROUPS.map(group => ({
    ...group,
    actions: actionsForGroup(group.id, enabledActions, layout),
  }))
  const hasActions = enabledActions.length > 0
  const groupHasRecommendation = (id: OptionalGroupId) =>
    groups.some(group => group.id === id && group.actions.some(action => visibleRecommendation?.ids.includes(action.id)))
  const toggleGroup = async (id: OptionalGroupId) => {
    if (layoutSaving || snapshot.status !== 'ready' || !snapshot.writable || snapshot.revision === undefined) return
    setLayoutSaving(true)
    setNotice('')
    try {
      const next = { ...layout, visibleGroups: { ...layout.visibleGroups, [id]: !layout.visibleGroups[id] } }
      if (!await saveLayout(JSON.stringify(next), snapshot.revision)) setNotice(t('rejected'))
    } catch (error) { setNotice(t('unsaved') + explain(error)) }
    finally { if (alive.current) setLayoutSaving(false) }
  }
  const available = input.phase === 'plain' && !pending && snapshot.status === 'ready'
  const insert = async (action: CodingAction) => {
    if (!available) return
    setNotice('')
    const span = inputActions.captureInsertion()
    if (span.start !== span.end) { setNotice(t('selection')); return }
    if (action.kind === 'skill' && (span.start !== 0 || input.draft.startsWith('/'))) {
      setNotice(t('start')); return
    }
    let value = withEvidence(action.prompt, recommendation, action.id, entries, t('defaultLocale') === 'en')
    if (action.kind === 'skill') {
      const skillId = action.skillId ?? ''
      setPending(true)
      try {
        const names = await fetchSkillNames()
        if (!alive.current) return
        if (!names.includes(skillId)) { setNotice(t('missing') + skillId + t('install')); return }
        value = '/' + skillId + ' ' + value + (input.draft.length ? '\n\n' : '')
      } catch (error) { if (alive.current) setNotice(t('readFailed') + String(error)); return }
      finally { if (alive.current) setPending(false) }
    } else if (input.draft.length) value = '\n\n' + value
    if (!alive.current) return
    if (!inputActions.insertText(value, span)) { setNotice(t('draftChanged')); return }
    inputActions.persistDraft()
  }
  // One panel command at a time; a rejected revision surfaces as a notice instead of a silent no-op.
  const runWorkflow = async (action: 'approve' | 'pause' | 'resume' | 'cancel') => {
    if (pending) return
    setPending(true)
    setNotice('')
    try {
      const text = decision.trim()
      let result
      if (action === 'approve') result = await workflowCommands.approve(text)
      else if (action === 'cancel') result = await workflowCommands.cancel(text)
      else if (action === 'pause') result = await workflowCommands.pause()
      else result = await workflowCommands.resume()
      if (!alive.current) return
      if (!result.ok) { setNotice(t('workflowActionFailed') + (result.message ?? '')); return }
      if (action === 'approve' || action === 'cancel') setDecision('')
    } catch (error) {
      if (alive.current) setNotice(t('workflowActionFailed') + String(error))
    } finally {
      if (alive.current) setPending(false)
    }
  }
  // Presentation-only aliases for stored, unchanged legacy preset labels.
  const displayLabel = (a: CodingAction): string => {
    if (a.id === 'review-fix' && a.label === '修复审核问题') return '修复'
    if (a.id === 'bug' && a.label === 'Bug 排查') return 'Bug排查'
    if (a.id === 'docx' && a.label === 'MD 转 Word') return 'MD转Word'
    return a.label
  }
  const render = (a: CodingAction) => <button type="button" key={a.id} disabled={!available} className={visibleRecommendation?.ids.includes(a.id) ? css.recommended : css.action}
    title={a.description + '\n' + a.example + (visibleRecommendation?.ids.includes(a.id) ? '\n' + t('recommendationTooltip').replace('{reason}', t(visibleRecommendation.reason)) : '')} onClick={() => { void insert(a) }}>{displayLabel(a)}</button>
  const item = workflow.item
  // Expansion is local presentation state, independent of saved membership and action availability.
  const renderGroupActions = (id: string, label: string, members: CodingAction[]) => {
    const limit = 8
    const expanded = expandedGroups[id] === true
    const overflow = members.slice(limit)
    const hiddenRecommendation = !expanded && overflow.some(action => visibleRecommendation?.ids.includes(action.id))
    const toggleLabel = expanded ? t('collapse') : t('moreCount').replace('{count}', String(overflow.length))
    return <div className={css.row}>
      {(expanded ? members : members.slice(0, limit)).map(render)}
      {overflow.length > 0 && <button type="button" className={css.action} aria-expanded={expanded}
        aria-label={t('groupOverflowLabel').replace('{group}', label).replace('{action}', toggleLabel)}
        onClick={() => { setExpandedGroups(previous => ({ ...previous, [id]: !previous[id] })) }}>
        {toggleLabel + (hiddenRecommendation ? ' •' : '')}
      </button>}
    </div>
  }
  return <div className={css.root} data-matt-skill-launcher>
    {item !== null && <WorkflowPanel item={item} decision={decision} pending={pending}
      onDecision={setDecision} onAction={(action) => { void runWorkflow(action) }} t={t} />}
    {hasActions && <>
      <div className={css.groupToggles} role="group" aria-label={t('groupVisibility')}>
        <span className={css.groupToggleLabel}>{t('groupVisibility')}</span>
        {groups.map(group => <button key={group.id} type="button"
          className={layout.visibleGroups[group.id] ? css.groupToggleActive : css.groupToggle}
          aria-pressed={layout.visibleGroups[group.id]}
          disabled={layoutSaving || snapshot.status !== 'ready' || !snapshot.writable}
          onClick={() => { void toggleGroup(group.id) }}>
          {t(group.label)}
          {!layout.visibleGroups[group.id] && groupHasRecommendation(group.id) ? ' •' : ''}
        </button>)}
      </div>
      <div className={css.actionGroup} data-launcher-group="common">
        <div className={css.groupHeader}><span>{t('groupCommon')}</span><span className={css.locked}>{t('groupAlwaysVisible')}</span></div>
        {renderGroupActions('common', t('groupCommon'), commonActions)}
      </div>
      {groups.filter(group => layout.visibleGroups[group.id] && group.actions.length > 0).map(group =>
        <div className={css.actionGroup} key={group.id} data-launcher-group={group.id}>
          <div className={css.groupHeader}>
            <span>{t(group.label)}</span>
            <button type="button" className={css.hideGroup} disabled={layoutSaving || !snapshot.writable}
              onClick={() => { void toggleGroup(group.id) }}>{t('hideGroup')}</button>
          </div>
          {renderGroupActions(group.id, t(group.label), group.actions)}
        </div>)}
    </>}
    {visibleRecommendation && <div className={css.hint} aria-live="polite">{t('recommendationHint').replace('{actions}', recommendedActions.map(displayLabel).join(t('recommendationSeparator'))).replace('{reason}', t(visibleRecommendation.reason))}</div>}
    {watching && <div className={`${css.progressWarning} ${planMayBeStale ? css.progressWarningActive : ''}`} role="status">
      {planMayBeStale ? t('todoStale').replace('{minutes}', String(unchangedMinutes)) : null}
    </div>}
    {(invalid || notice) && <div className={css.notice} role="alert">{invalid ? t('invalid') + invalid : notice}</div>}
  </div>
}
