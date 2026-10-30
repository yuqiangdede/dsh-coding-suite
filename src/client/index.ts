import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { en, zh, type LauncherLocaleKey } from './locales.ts'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { LAUNCHER_CONFIG_GLOBAL, LauncherDeploymentSchema } from '../config.ts'
import { Launcher } from './Launcher.tsx'
import { LauncherSettings } from './Settings.tsx'
/** Host-persisted launcher configuration. */
export interface ActionSettings { actionsJson?: string; layoutJson?: string }
/** Settings form and revision-checked save operation. */
export interface LauncherSettingsInjected {
  hooks: { actionForm: ConfigForm<ActionSettings> }
  saveActions: (json:string, revision?:number)=>Promise<boolean>
  saveConfiguration: (actionsJson: string, layoutJson: string, revision?: number) => Promise<boolean>
}
/** Launcher form, Skill catalog, and Host's stale-plan threshold. */
export interface LauncherInjected {
  hooks: { actionForm: ConfigForm<ActionSettings> }
  fetchSkillNames: ()=>Promise<readonly string[]>
  saveLayout: (json: string, revision?: number) => Promise<boolean>
  todoStaleMs: number
}
declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap { mattSkillLauncher: unknown }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Launcher settings and insertion feedback. */
    mattSkillLauncher: LauncherLocaleKey
  }
}
/**
 * TEMP [DEBUG-a4f2] disappearance probe — delete this whole block with its
 * {@link installLauncherDisappearanceProbe} call once the root cause is fixed.
 *
 * Why a probe instead of a console reading: the dock can disappear without any
 * exception. The Conversation shell calls
 * `zone !== void 0 && renderSlot('conversation.input.dock', zone)` with
 * `zone = session === void 0 || inputState === void 0 ? void 0 : {...}`, so an
 * unresolved Session or input state unmounts the dock silently — no console
 * output, no `data-slot-error` crash face, and nothing to reproduce after a
 * restart. This records the first present->absent transition, the slot anchors
 * still in the DOM, and the recent error buffer, then keeps them in
 * localStorage and on screen so a restart cannot lose the evidence.
 */
interface LauncherProbeRecord {
  at: string
  /** Dock outlet anchor present: the shell did render the slot. */
  outlet: boolean
  /** Crash faces (abdicated entries) found anywhere in the page. */
  crashFaces: string[]
  /** Every `data-slot` anchor key currently mounted. */
  anchors: string[]
  /** A composer editor is on screen, so the dock is expected. */
  composer: boolean
  events: string[]
}
const LAUNCHER_PROBE_STORE = 'dsh-coding-suite:launcher-probe'
const LAUNCHER_PROBE_BANNER = 'data-dsh-launcher-probe'

function describeProbeValue(value: unknown): string {
  try {
    if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ''}`
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch { return String(value) }
}

function showProbeBanner(record: LauncherProbeRecord, note: string): void {
  document.querySelector(`[${LAUNCHER_PROBE_BANNER}]`)?.remove()
  const banner = document.createElement('div')
  banner.setAttribute(LAUNCHER_PROBE_BANNER, '')
  banner.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;'
    + 'background:#7f1d1d;color:#fff;font:11px/1.5 ui-monospace,Consolas,monospace;padding:10px 12px;'
    + 'border-radius:6px;max-height:46vh;overflow:auto;white-space:pre-wrap;box-shadow:0 4px 16px rgba(0,0,0,.4)'
  banner.textContent = `[DEBUG-a4f2] 编码套件探针 · ${note}\n${JSON.stringify(record, null, 2)}\n（点击关闭；同样内容已存 localStorage: ${LAUNCHER_PROBE_STORE}）`
  banner.addEventListener('click', () => { banner.remove() })
  document.body.appendChild(banner)
}

function installLauncherDisappearanceProbe(): void {
  try {
    armLauncherDisappearanceProbe()
  } catch {
    // A temporary probe must never be the reason the plugin fails to apply.
  }
}

function armLauncherDisappearanceProbe(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined' || document.body === null) return
  const holder = globalThis as { __dshLauncherDisappearanceProbe?: { events: string[] } }
  const stored = (): LauncherProbeRecord | undefined => {
    try {
      const text = localStorage.getItem(LAUNCHER_PROBE_STORE)
      return text === null ? undefined : JSON.parse(text) as LauncherProbeRecord
    } catch { return undefined }
  }
  if (holder.__dshLauncherDisappearanceProbe !== undefined) {
    // Re-applied (plugin enable/disable or HMR): surface what the last run saw.
    const previous = stored()
    if (previous !== undefined) showProbeBanner(previous, '上次运行记录')
    return
  }
  const events: string[] = []
  const remember = (label: string, detail: unknown): void => {
    if (events.length >= 24) events.shift()
    events.push(`${new Date().toLocaleTimeString()} ${label} ${describeProbeValue(detail)}`.slice(0, 2000))
  }
  holder.__dshLauncherDisappearanceProbe = { events }
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    try { remember('console.error', args.map(describeProbeValue).join(' ')) } catch { /* probe must never break logging */ }
    originalError(...args)
  }
  window.addEventListener('error', event => { try { remember('window.error', event.error ?? event.message) } catch { /* ignore */ } })
  window.addEventListener('unhandledrejection', event => {
    try { remember('unhandledrejection', (event as PromiseRejectionEvent).reason) } catch { /* ignore */ }
  })
  const snapshot = (): LauncherProbeRecord => ({
    at: new Date().toISOString(),
    outlet: document.querySelector('[data-slot="conversation.input.dock"]') !== null,
    crashFaces: [...document.querySelectorAll('[data-slot-error],[data-factory-error]')]
      .map(node => node.getAttribute('data-slot-error') ?? node.getAttribute('data-factory-error') ?? '?'),
    anchors: [...document.querySelectorAll('[data-slot]')]
      .map(node => node.getAttribute('data-slot') ?? '?').slice(0, 40),
    composer: document.querySelector('[contenteditable="true"]') !== null,
    events: [...events],
  })
  let everSeen = false
  let missingSince = 0
  let recorded = false
  const check = (): void => {
    try {
      if (document.querySelector('[data-matt-skill-launcher]') !== null) {
        everSeen = true
        missingSince = 0
        return
      }
      // Nothing to report before the first mount, or while no composer exists.
      if (!everSeen || document.querySelector('[contenteditable="true"]') === null) return
      // The hero (no-Session) screen legitimately renders no dock: the shell only
      // mounts it while a Session and its input state both resolve.
      if (document.querySelector('[data-slot^="conversation.hero."]') !== null) return
      if (missingSince === 0) { missingSince = Date.now(); return }
      // Require the absence to persist so a single transient frame is ignored.
      if (recorded || Date.now() - missingSince < 1500) return
      recorded = true
      const record = snapshot()
      try { localStorage.setItem(LAUNCHER_PROBE_STORE, JSON.stringify(record)) } catch { /* ignore quota */ }
      showProbeBanner(record, '按钮区消失')
    } catch { /* probe must never break the plugin */ }
  }
  new MutationObserver(check).observe(document.body, { childList: true, subtree: true })
  window.setInterval(check, 1000)
  const armed = document.createElement('div')
  armed.setAttribute(LAUNCHER_PROBE_BANNER, '')
  armed.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;background:#1e293b;color:#e2e8f0;'
    + 'font:11px/1.5 ui-monospace,Consolas,monospace;padding:6px 10px;border-radius:6px;opacity:.9'
  armed.textContent = '[DEBUG-a4f2] 按钮消失探针已启用（临时诊断）'
  document.body.appendChild(armed)
  window.setTimeout(() => { armed.remove() }, 6000)
  const previous = stored()
  if (previous !== undefined) showProbeBanner(previous, '上次记录（刷新前）')
}

export const inject = ['locale', 'slots','sessions','remote','remote.skills','configForms']
export function apply(ctx: ClientContext): void {
  installLauncherDisappearanceProbe()
  ctx.effect(() => ctx.locale.register('mattSkillLauncher', { zh, en }), 'launcher dictionaries')
  const t = ctx.locale.bind('mattSkillLauncher')
  const form = ctx.configForms.get<ActionSettings>('coding-suite')
  // The page-global carries the Host-resolved policy; this read validates it
  // against the same field schema the Host Config uses.
  const deployment = LauncherDeploymentSchema(
    (globalThis as { [LAUNCHER_CONFIG_GLOBAL]?: unknown })[LAUNCHER_CONFIG_GLOBAL] ?? {},
  )
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock', locale: 'mattSkillLauncher', id: 'matt-skill-launcher', order: 1,
    inject: (sessionId): LauncherInjected => ({
        hooks: { actionForm: form },
        todoStaleMs: deployment.todoStaleMs,
        saveLayout: (json, rev) => form.mutate([{ op: 'set', path: ['layoutJson'], value: json }], rev),
        fetchSkillNames: async () => {
          if (ctx.sessions.binding(sessionId) === undefined) throw new Error('Session unavailable')
          return ctx.sessions.using(sessionId,{ source:'mattSkillLauncher' },async (ref)=>{
            if (ref.binding.session.getSnapshot().openState !== 'open') throw new Error('Session not open')
            const result = await ctx.remote.skills.list({ sessionId })
            if (!result.ok) throw new Error(result.error.message)
            return result.value.skills.map(skill=>skill.name)
          })
        },
      }),
  }, Launcher))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', locale: 'mattSkillLauncher', id: 'matt-skill-launcher', order: 80, label: () => t('title'),
    inject: (): LauncherSettingsInjected => ({
      hooks: { actionForm: form },
      saveActions: (json, rev)=>form.mutate([{ op:'set',path:['actionsJson'],value:json }],rev),
      saveConfiguration: (actionsJson, layoutJson, rev) => form.mutate([
        { op: 'set', path: ['actionsJson'], value: actionsJson },
        { op: 'set', path: ['layoutJson'], value: layoutJson },
      ], rev),
    }),
  }, LauncherSettings))
}
