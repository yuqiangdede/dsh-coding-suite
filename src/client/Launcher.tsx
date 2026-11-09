import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { DEFAULT_ACTIONS, DIAGNOSTIC_MODES, REQUIREMENTS_HTML_PROMPT, parseActions, actionErrorKey, presentDefaultActions, displayOrder, type CodingAction } from './actions.ts'
import type { LauncherInjected } from './index.ts'
import { chatEntries, conversationHistory, recommend, withEvidence } from './contextual-actions.ts'
import { LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout, fittedActionCount, parseLauncherLayout, type GroupId } from './launcher-layout.ts'
import css from './Launcher.module.css'
type Props = PropsRuntime<'conversation.input.dock'> & PropsLocale<'mattSkillLauncher'> & InjectFace<LauncherInjected>

/** Attribute-safe selector value for a Chat node key. */
function escapeSelectorValue(value: string): string {
  const escape = (globalThis as { CSS?: { escape?: (input: string) => string } }).CSS?.escape
  return typeof escape === 'function' ? escape(value) : value.replace(/["\\]/g, '\\$&')
}

/** Chat scrollport that renders this dock, or the single mounted one. */
function chatScrollport(from: Element | null): Element | null {
  if (typeof document === 'undefined') return null
  const own = from?.closest?.('[data-conversation-scroll]')
  if (own) return own
  const mounted = document.querySelectorAll('[data-conversation-scroll]')
  return mounted.length === 1 ? mounted[0] ?? null : null
}

/** Reveal one mounted Chat row: open folded ancestors, scroll it into view, then flash it. */
function revealChatRow(row: HTMLElement, boundary: Element): void {
  const folded: Element[] = []
  for (let element = row.parentElement; element !== null && element !== boundary; element = element.parentElement) {
    if (element.getAttribute('hidden') === 'until-found') folded.push(element)
  }
  // The host re-renders folded content after `beforematch`, exactly as browser find does.
  if (typeof Event === 'function') for (const element of folded.reverse()) element.dispatchEvent(new Event('beforematch'))
  const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const apply = () => {
    row.scrollIntoView?.({ block: 'center', behavior: reduced ? 'instant' : 'smooth' })
    if (reduced || typeof row.animate !== 'function') return
    row.animate([
      { boxShadow: 'inset 0 0 0 2px var(--dsw-alias-state-info-primary, #4d6bfe)' },
      { boxShadow: 'inset 0 0 0 2px transparent' },
    ], { duration: 1400, easing: 'ease-out' })
  }
  // Folded ancestors need a paint before their opened geometry can be measured.
  if (folded.length > 0 && typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(apply))
  else apply()
}
export function Launcher({
  useInput, useConversation, useSession, useProjection, inputActions, useActionForm, fetchSkillNames,
  saveLayout, todoStaleMs, t,
}: Props) {
  const snapshot = useActionForm(x => x)
  const input = useInput(x => x)
  const chat = useConversation(x => x.views.get('chat'))
  const sessionRunning = useSession(x => x.running)
  const commandLock = useRef(false)
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
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  // Measured per-row button budget; absent entries keep the fixed fallback.
  const [groupLimits, setGroupLimits] = useState<Record<string, number>>({})
  const groupLimitsRef = useRef(groupLimits)
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [optimisticLayout, setOptimisticLayout] = useState<{ base: string | undefined, value: ReturnType<typeof defaultLauncherLayout> } | null>(null)
  useEffect(() => {
    if (optimisticLayout && snapshot.value?.layoutJson !== optimisticLayout.base) setOptimisticLayout(null)
  }, [optimisticLayout, snapshot.value?.layoutJson])
  const [commonEdit, setCommonEdit] = useState<{ ids: string[], revision: number } | null>(null)
  const [diagnosticAction, setDiagnosticAction] = useState<CodingAction | null>(null)
  const [imageAction, setImageAction] = useState<CodingAction | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const alive = useRef(true)
  const groupRows = useRef<Record<string, HTMLDivElement | null>>({})
  const groupProbes = useRef<Record<string, HTMLDivElement | null>>({})
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
  if (optimisticLayout && snapshot.value?.layoutJson === optimisticLayout.base) layout = optimisticLayout.value
  const enabledActions = actions.filter(a => a.enabled && a.id !== 'product-development-pipeline').sort((a, b) => displayOrder(a) - displayOrder(b))
  // Buttons travel with their own prompt, so the request can be attributed by id
  // instead of guessing the stage from keywords inside that prompt.
  const entries = sessionRunning ? [] : chatEntries(chat)
  const history = conversationHistory(chat, actions)
  const latestReply = !sessionRunning && entries.at(-1)?.role === 'assistant' ? entries.at(-1)?.text : ''
  const initializeAction = DEFAULT_ACTIONS.find(action => action.id === 'initialize')!
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
  // Common-only presets and custom actions must remain editable even if they
  // do not belong to a business group in the launcher.
  const groupedIds = new Set(groups.flatMap(group => group.actions.map(action => action.id)))
  const editorGroups = groups.map(group => group.id === 'others'
    ? { ...group, actions: [...group.actions, ...enabledActions.filter(action => !groupedIds.has(action.id))] }
    : group)
  // Presentation-only sizing: fill each row with the buttons that actually fit
  // and collapse the rest into More. Membership, order and saved layout stay
  // untouched; a host without a measurable DOM keeps the fixed fallback.
  const measurable = typeof document !== 'undefined'
  const measuredGroups = [
    { id: 'common', actions: commonActions },
    ...groups.filter(group => layout.visibleGroups[group.id] && group.actions.length > 0),
  ]
  const measurementKey = JSON.stringify([commonEdit !== null, layout.visibleGroups, measuredGroups.map(group => [group.id, group.actions.map(action => [action.id, action.label])]), t('moreCount')])
  useLayoutEffect(() => {
    if (!measurable) return
    const measure = () => {
      const measured: Record<string, number> = {}
      for (const group of measuredGroups) {
        const row = groupRows.current[group.id]
        const probe = groupProbes.current[group.id]
        if (!row || !probe || group.actions.length === 0) continue
        const buttons = Array.from(probe.querySelectorAll<HTMLElement>('[data-launcher-measure-action]'))
        if (buttons.length !== group.actions.length) continue
        const more = probe.querySelector<HTMLElement>('[data-launcher-measure-more]')
        // A hidden or not-yet-laid-out dock keeps the fallback budget.
        const rowWidth = row.getBoundingClientRect().width
        if (rowWidth <= 0) continue
        const style = window.getComputedStyle(row)
        const gap = Number.parseFloat(style.columnGap) || Number.parseFloat(style.gap) || 5
        // Fractional rect widths avoid accumulated rounding; keep one pixel of
        // slack so layout rounding cannot push the More button onto a new line.
        const fitted = fittedActionCount(
          buttons.map(button => button.getBoundingClientRect().width),
          rowWidth - 1,
          gap,
          more?.getBoundingClientRect().width ?? 0,
        )
        measured[group.id] = fitted >= group.actions.length ? group.actions.length : Math.max(1, fitted)
      }
      // Avoid scheduling a synchronous layout update when measurement is stable.
      // React can hit its nested-update limit even when an updater returns the
      // previous state if it is dispatched on every layout effect.
      if (Object.keys(measured).some(id => groupLimitsRef.current[id] !== measured[id])) {
        groupLimitsRef.current = { ...groupLimitsRef.current, ...measured }
        setGroupLimits(groupLimitsRef.current)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    for (const row of Object.values(groupRows.current)) if (row) observer.observe(row)
    // Font or label changes resize the probe before the row itself changes.
    for (const probe of Object.values(groupProbes.current)) if (probe) observer.observe(probe)
    return () => { observer.disconnect() }
  }, [measurable, measurementKey])
  const hasActions = enabledActions.length > 0
  const groupHasRecommendation = (id: GroupId) =>
    (id === 'common' ? commonActions : groups.find(group => group.id === id)?.actions ?? []).some(action => visibleRecommendation?.ids.includes(action.id))
  const toggleGroup = async (id: GroupId) => {
    if (layoutSaving || snapshot.status !== 'ready' || !snapshot.writable || snapshot.revision === undefined) return
    const next = { ...layout, visibleGroups: { ...layout.visibleGroups, [id]: !layout.visibleGroups[id] } }
    setOptimisticLayout({ base: snapshot.value?.layoutJson, value: next })
    setLayoutSaving(true)
    setNotice('')
    try {
      if (!await saveLayout(JSON.stringify(next), snapshot.revision)) { setOptimisticLayout(null); setNotice(t('rejected')) }
    } catch (error) { setOptimisticLayout(null); setNotice(t('unsaved') + explain(error)) }
    finally { if (alive.current) setLayoutSaving(false) }
  }
  const startCommonEdit = () => {
    if (invalid || layoutSaving || snapshot.status !== 'ready' || !snapshot.writable || snapshot.revision === undefined) return
    setNotice('')
    setCommonEdit({ ids: [...layout.commonActionIds], revision: snapshot.revision })
  }
  const saveCommonEdit = async () => {
    if (!commonEdit || layoutSaving || snapshot.status !== 'ready' || !snapshot.writable) return
    if (snapshot.revision !== commonEdit.revision) { setNotice(t('conflict')); return }
    if (commonEdit.ids.length > 100) { setNotice(t('commonLimit')); return }
    setLayoutSaving(true)
    setNotice('')
    try {
      const next = { ...layout, commonActionIds: commonEdit.ids }
      if (await saveLayout(JSON.stringify(next), commonEdit.revision)) {
        if (alive.current) setCommonEdit(null)
      } else if (alive.current) setNotice(t('rejected'))
    } catch (error) { if (alive.current) setNotice(t('unsaved') + explain(error)) }
    finally { if (alive.current) setLayoutSaving(false) }
  }
  const available = input.phase === 'plain' && !pending && snapshot.status === 'ready'
  // Fixed conversation utility, not a coding Skill: allow it before initialization.
  // Never submit existing draft text or attachments as an accidental approval.
  const confirmReady = available && !commandLock.current && latestReply.trim().length > 0
    && entries.at(-1)?.failed !== true && input.draft.length === 0 && input.attachmentIds.length === 0
  const confirmPrevious = () => {
    if (!confirmReady || commandLock.current) return
    const span = inputActions.captureInsertion()
    if (span.start !== 0 || span.end !== 0) { setNotice(t('confirmDraft')); return }
    if (!inputActions.insertText(t('confirmPrompt'), span)) { setNotice(t('draftChanged')); return }
    setNotice('')
    // DSH's public composer action submits the freshly inserted text once.
    inputActions.submit()
  }
  const insert = async (action: CodingAction) => {
    if (!available || commandLock.current) return
    setNotice('')
    const span = inputActions.captureInsertion()
    if (span.start !== span.end) { setNotice(t('selection')); return }
    if (action.kind === 'skill' && (span.start !== 0 || input.draft.startsWith('/'))) {
      setNotice(t('start')); return
    }
    const requirementButtons = actionsForGroup('requirements-analysis', enabledActions, layout)
      .map(button => ({ stage: DEFAULT_ACTIONS.find(preset => preset.id === button.id)?.label ?? button.label, label: button.label }))
    let value = withEvidence(action.prompt, recommendation, action.id, entries, t('defaultLocale') === 'en', requirementButtons)
    if (action.kind === 'skill') {
      const skillId = action.skillId ?? ''
      commandLock.current = true
      setPending(true)
      try {
        const names = await fetchSkillNames()
        if (!alive.current) return
        if (!names.includes(skillId)) { setNotice(t('missing') + skillId + t('install')); return }
        value = '/' + skillId + ' ' + value + (input.draft.length ? '\n\n' : '')
      } catch (error) { if (alive.current) setNotice(t('readFailed') + String(error)); return }
      finally { commandLock.current = false; if (alive.current) setPending(false) }
    } else if (input.draft.length) value = '\n\n' + value
    if (!alive.current) return
    if (!inputActions.insertText(value, span)) { setNotice(t('draftChanged')); return }
    inputActions.persistDraft()
  }
  // Presentation-only aliases for stored, unchanged legacy preset labels.
  const displayLabel = (a: CodingAction): string => {
    if (a.id === 'review-fix' && a.label === '修复审核问题') return '修复'
    if (a.id === 'bug' && a.label === 'Bug 排查') return 'Bug排查'
    if (a.id === 'docx' && a.label === 'MD 转 Word') return 'MD转Word'
    return a.label
  }
  const historyGroups: { label: string; count: number; key?: string; text?: string }[] = []
  for (const entry of history) {
    const label = entry.id ? displayLabel(actions.find(action => action.id === entry.id)!) : entry.command ? '/' + entry.command : t('historyCustom')
    const previous = historyGroups[historyGroups.length - 1]
    if (previous?.label === label) {
      previous.count++
      // A grouped chip addresses its newest message, which is the one in view first.
      previous.key = entry.key
      previous.text = entry.text
    } else historyGroups.push({ label, count: 1, key: entry.key, text: entry.text })
  }
  historyGroups.reverse()
  // A recognized label only explains the request: locating it is a read-only jump
  // to the mounted Chat row, never a replay, an edit or a resend.
  const locateHistory = (group: { key?: string }) => {
    setNotice('')
    const scrollport = chatScrollport(rootRef.current)
    const row = scrollport === null || group.key === undefined
      ? null
      : scrollport.querySelector<HTMLElement>(`[data-chat-node-key="${escapeSelectorValue(group.key)}"]`)
    if (scrollport === null || row === null) { setNotice(t('historyMissing')); return }
    revealChatRow(row, scrollport)
  }
  const historyTooltip = (group: { count: number; text?: string }): string => {
    const head = group.count > 1 ? t('historyLocateNewest').replace('{count}', String(group.count)) : t('historyLocate')
    const preview = group.text?.replace(/\s+/g, ' ').trim() ?? ''
    return preview ? head + '\n' + (preview.length > 60 ? preview.slice(0, 59) + '…' : preview) : head
  }
  const render = (a: CodingAction) => <button type="button" key={a.id} disabled={!available} className={visibleRecommendation?.ids.includes(a.id) ? css.recommended : css.action}
    title={a.description + '\n' + a.example + (visibleRecommendation?.ids.includes(a.id) ? '\n' + t('recommendationTooltip').replace('{reason}', t(visibleRecommendation.reason)) : '')} onClick={() => {
      if (a.id === 'add-logs' && a.kind === 'skill' && DIAGNOSTIC_MODES.some(mode => mode.skillId === a.skillId)) setDiagnosticAction(a)
      else if (a.id === 'product-image-prompt' && a.kind === 'skill' && a.skillId === a.id) setImageAction(a)
      else void insert(a)
    }}>{displayLabel(a)}</button>
  // Expansion is local presentation state, independent of saved membership and action availability.
  const renderGroupActions = (id: string, label: string, members: CodingAction[]) => {
    const fallback = 8
    const limit = Math.min(groupLimits[id] ?? fallback, members.length)
    const expanded = expandedGroups[id] === true
    const overflow = members.slice(limit)
    const hiddenRecommendation = !expanded && overflow.some(action => visibleRecommendation?.ids.includes(action.id))
    const toggleLabel = expanded ? t('collapse') : t('moreCount').replace('{count}', String(overflow.length))
    return <div className={css.row} data-launcher-row={id}
      ref={element => { groupRows.current[id] = element }}>
      {(expanded ? members : members.slice(0, limit)).map(render)}
      {overflow.length > 0 && <button type="button" className={css.action} aria-expanded={expanded}
        aria-label={t('groupOverflowLabel').replace('{group}', label).replace('{action}', toggleLabel)}
        onClick={() => { setExpandedGroups(previous => ({ ...previous, [id]: !previous[id] })) }}>
        {toggleLabel + (hiddenRecommendation ? ' •' : '')}
      </button>}
      {measurable && <div className={css.measureRow} data-launcher-measure={id} aria-hidden="true"
        ref={element => { groupProbes.current[id] = element }}>
        {members.map(action => <button key={action.id} type="button" disabled tabIndex={-1} className={css.action}
          data-launcher-measure-action>{displayLabel(action)}</button>)}
        <button type="button" disabled tabIndex={-1} className={css.action} data-launcher-measure-more>
          {t('moreCount').replace('{count}', String(members.length)) + ' •'}
        </button>
      </div>}
    </div>
  }
  const renderImageOptions = () => imageAction && <div className={css.actionGroup} role="group" aria-label={t('imageOutputChoose')} data-image-output-modes>
    <div className={css.groupHeader}>{t('imageOutputChoose')}</div>
    <div className={css.row}>
      <button type="button" className={css.action} disabled={!available} onClick={() => { setImageAction(null); void insert(imageAction) }}>{t('imageOutputPrompt')}</button>
      <button type="button" className={css.action} disabled={!available} onClick={() => { setImageAction(null); void insert({ ...imageAction, kind: 'prompt', prompt: REQUIREMENTS_HTML_PROMPT }) }}>{t('imageOutputHtml')}</button>
      <button type="button" className={css.action} onClick={() => setImageAction(null)}>{t('cancelCommon')}</button>
    </div>
  </div>
  return <div ref={rootRef} className={css.root} data-matt-skill-launcher>
    {(hasActions || historyGroups.length > 0) && <div className={css.groupToggles}>
      {hasActions && <div className={css.groupControls} role="group" aria-label={t('groupVisibility')}>
        <span className={css.groupToggleLabel}>{t('groupVisibility')}</span>
        <button type="button" title={t('groupCommonHelp')} className={layout.visibleGroups.common ? css.groupToggleActive : css.groupToggle}
          aria-pressed={layout.visibleGroups.common} disabled={layoutSaving || Boolean(commonEdit) || snapshot.status !== 'ready' || !snapshot.writable}
          onClick={() => { void toggleGroup('common') }}>
          {t('groupCommon')}{!layout.visibleGroups.common && groupHasRecommendation('common') ? ' •' : ''}
        </button>
        {groups.map(group => <button key={group.id} type="button" title={t(({ 'requirements-analysis': 'groupRequirementsHelp', development: 'groupDevelopmentHelp', documents: 'groupDocumentsHelp', others: 'groupOthersHelp' } as const)[group.id])}
          className={layout.visibleGroups[group.id] ? css.groupToggleActive : css.groupToggle}
          aria-pressed={layout.visibleGroups[group.id]}
          disabled={layoutSaving || snapshot.status !== 'ready' || !snapshot.writable}
          onClick={() => { void toggleGroup(group.id) }}>
          {t(group.label)}
          {!layout.visibleGroups[group.id] && groupHasRecommendation(group.id) ? ' •' : ''}
        </button>)}
        <button type="button" data-setup-action="initialize"
          className={css.utilityAction}
          aria-label={t('setupLabel')} title={t('setupReady')}
          onClick={() => { void insert(initializeAction) }} disabled={!available}>
          {t('setupLabel')}
        </button>
        <button type="button" data-quick-confirm="previous-reply"
          className={css.utilityAction} aria-label={t('confirmLabel')}
          title={confirmReady ? t('confirmTooltip') : t('confirmUnavailable')}
          disabled={!confirmReady} onClick={confirmPrevious}>{t('confirmLabel')}</button>
        <button type="button" data-edit-common className={css.utilityAction} onClick={startCommonEdit}
          disabled={Boolean(commonEdit) || Boolean(invalid) || layoutSaving || snapshot.status !== 'ready' || !snapshot.writable || snapshot.revision === undefined}>{t('editCommon')}</button>
      </div>}
      {historyGroups.length > 0 && <div className={css.history} data-conversation-history>
        <ol className={css.historyList} aria-label={t('historyTitle')} title={t('historyHelp')}>
          {(historyExpanded ? historyGroups : historyGroups.slice(0, 5)).map((entry, index) => <li key={index} className={css.historyItem}>
            <button type="button" className={css.historyChip} data-history-key={entry.key ?? ''}
              title={historyTooltip(entry)} onClick={() => { locateHistory(entry) }}>
              {entry.label + (entry.count > 1 ? '*' + entry.count : '')}
            </button>
          </li>)}
        </ol>
        {historyGroups.length > 5 && <button type="button" className={css.hideGroup} aria-expanded={historyExpanded}
          onClick={() => setHistoryExpanded(value => !value)}>{historyExpanded ? t('collapse') : t('historyMore').replace('{count}', String(historyGroups.length))}</button>}
      </div>}
    </div>}
    {hasActions && <>
      {commonEdit && <div className={css.commonEditor} role="group" aria-label={t('editCommon')}>
        <div className={css.groupHeader}><span>{t('commonEditHelp')}</span></div>
        <div className={css.commonChoices}>
          {editorGroups.filter(group => group.actions.length > 0).map(group => <div className={css.commonChoiceGroup}
            key={group.id} role="group" aria-label={t(group.label)} data-common-editor-group={group.id}>
            <div className={css.groupHeader}>{t(group.label)}</div>
            <div className={css.row}>
              {group.actions.map(action => <label className={css.commonChoice} key={action.id} title={action.description}>
                <input type="checkbox" checked={commonEdit.ids.includes(action.id)} disabled={layoutSaving}
                  onChange={event => setCommonEdit(current => current && ({ ...current, ids: event.target.checked
                    ? [...current.ids, action.id] : current.ids.filter(id => id !== action.id) }))} />
                {displayLabel(action)}
              </label>)}
            </div>
          </div>)}
        </div>
        <div className={css.row}>
          <button type="button" className={css.action} disabled={layoutSaving} onClick={() => { void saveCommonEdit() }}>{t('saveCommon')}</button>
          <button type="button" className={css.action} disabled={layoutSaving} onClick={() => { setCommonEdit(null); setNotice('') }}>{t('cancelCommon')}</button>
        </div>
      </div>}
      {!commonEdit && layout.visibleGroups.common && <div className={css.actionGroup} data-launcher-group="common">
        <div className={css.groupHeader}><span>{t('groupCommon')}</span>
          <button type="button" className={css.hideGroup} disabled={layoutSaving || !snapshot.writable}
            onClick={() => { void toggleGroup('common') }}>{t('hideGroup')}</button></div>
        {renderGroupActions('common', t('groupCommon'), commonActions)}
        {!layout.visibleGroups['requirements-analysis'] && renderImageOptions()}
      </div>}
      {!commonEdit && groups.filter(group => layout.visibleGroups[group.id] && group.actions.length > 0).map(group =>
        <div className={css.actionGroup} key={group.id} data-launcher-group={group.id}>
          <div className={css.groupHeader}>
            <span>{t(group.label)}</span>
            <button type="button" className={css.hideGroup} disabled={layoutSaving || !snapshot.writable}
              onClick={() => { void toggleGroup(group.id) }}>{t('hideGroup')}</button>
          </div>
          {renderGroupActions(group.id, t(group.label), group.actions)}
          {group.id === 'requirements-analysis' && renderImageOptions()}
        </div>)}
    </>}
    {diagnosticAction && <div className={css.actionGroup} role="group" aria-label={t('diagnosticChoose')} data-diagnostic-modes>
      <div className={css.groupHeader}>{t('diagnosticChoose')}</div>
      <div className={css.row}>
        {DIAGNOSTIC_MODES.map(mode => <button type="button" key={mode.skillId} className={css.action} disabled={!available}
          onClick={() => { setDiagnosticAction(null); void insert({ ...diagnosticAction, skillId: mode.skillId, prompt: diagnosticAction.prompt + '\n排查模式：' + mode.label }); }}>
          {t('defaultLocale') === 'en' ? mode.english : mode.label}
        </button>)}
        <button type="button" className={css.action} onClick={() => setDiagnosticAction(null)}>{t('cancelCommon')}</button>
      </div>
    </div>}
    {visibleRecommendation && <div className={css.hint} aria-live="polite">{t('recommendationHint').replace('{actions}', recommendedActions.map(displayLabel).join(t('recommendationSeparator'))).replace('{reason}', t(visibleRecommendation.reason))}</div>}
    {watching && <div className={`${css.progressWarning} ${planMayBeStale ? css.progressWarningActive : ''}`} role="status">
      {planMayBeStale ? t('todoStale').replace('{minutes}', String(unchangedMinutes)) : null}
    </div>}
    {(invalid || notice) && <div className={css.notice} role="alert">{invalid ? t('invalid') + invalid : notice}</div>}
  </div>
}
