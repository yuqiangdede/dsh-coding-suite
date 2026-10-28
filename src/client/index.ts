import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { en, zh, type LauncherLocaleKey } from './locales.ts'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type { GoalProjection, GoalRef } from '@deepseek-ai/dsh-goal/client'
import type { WorkItem } from '../workflow/types.ts'
import { LAUNCHER_CONFIG_GLOBAL, LauncherDeploymentSchema } from '../config.ts'
import { Launcher } from './Launcher.tsx'
import { LauncherSettings } from './Settings.tsx'
import { createCodingWorkflowSource } from './workflow-source.ts'
import type { CodingWorkflowSnapshot } from './workflow-source.ts'
/** Host-persisted launcher configuration. */
export interface ActionSettings { actionsJson?: string; layoutJson?: string }
/** Settings form and revision-checked save operation. */
export interface LauncherSettingsInjected {
  hooks: { actionForm: ConfigForm<ActionSettings> }
  saveActions: (json:string, revision?:number)=>Promise<boolean>
  saveConfiguration: (actionsJson: string, layoutJson: string, revision?: number) => Promise<boolean>
}
/** Identity of the exact Host task revision a user acted on. */
export interface WorkflowTaskRef {
  readonly taskId: string
  readonly revision: number
}
/** Outcome of one launcher-initiated workflow command. */
export interface WorkflowCommandResult {
  /** Whether the Host accepted the command. */
  readonly ok: boolean
  /** Failure message for the notice line. */
  readonly message?: string
  /** Accepted Host revision, used for a safe rollback after a later Goal failure. */
  readonly ref?: WorkflowTaskRef
}
/** Launcher mode values the workflow record understands. */
export type WorkflowMode = 'manual' | 'auto'
/** Launcher form, Skill catalog, the Session's coding Work Item, and the Host's stale-plan threshold. */
export interface LauncherInjected {
  hooks: { actionForm: ConfigForm<ActionSettings>; workflow: HostObservable<CodingWorkflowSnapshot> }
  fetchSkillNames: ()=>Promise<readonly string[]>
  saveLayout: (json: string, revision?: number) => Promise<boolean>
  pauseWorkflow: (ref: GoalRef) => Promise<{ readonly ok: true } | { readonly ok: false; readonly error: { readonly message: string } }>
  resumeWorkflow: (ref: GoalRef) => Promise<{ readonly ok: true } | { readonly ok: false; readonly error: { readonly message: string } }>
  /** Revision-checked mutations of the current coding task. */
  workflowCommands: {
    approve: (decision: string, ref?: WorkflowTaskRef) => Promise<WorkflowCommandResult>
    pause: (ref?: WorkflowTaskRef) => Promise<WorkflowCommandResult>
    resume: (ref?: WorkflowTaskRef) => Promise<WorkflowCommandResult>
    cancel: (reason: string, ref?: WorkflowTaskRef) => Promise<WorkflowCommandResult>
    setMode: (mode: WorkflowMode, ref?: WorkflowTaskRef) => Promise<WorkflowCommandResult>
  }
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
export const inject = ['locale', 'slots','sessions','remote','remote.skills','remote.goals','configForms']
export function apply(ctx: ClientContext): void {
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
    inject: (sessionId): LauncherInjected => {
      // A linked standalone install does not receive the application's generated
      // `remote.codingWorkflow` contribution; the dock must still mount without it.
      const workflowRemote = ctx.remote.codingWorkflow
      const workflow = createCodingWorkflowSource({
        read: async () => {
          const binding = ctx.sessions.binding(sessionId)
          if (binding === undefined || binding.session.getSnapshot().openState !== 'open') {
            return { ok: false, error: { code: 'session-unavailable', message: 'Session unavailable' } }
          }
          if (workflowRemote === undefined) {
            return { ok: false, error: { code: 'workflow-unavailable', message: 'Coding workflow remote unavailable' } }
          }
          return workflowRemote.get(sessionId)
        },
        subscribeChange: listener => {
          try {
            return ctx.remote.$on('coding-workflow/changed', (change) => {
              if (change.sessionId === sessionId) listener(change)
            })
          } catch {
            return () => {}
          }
        },
        subscribeReset: listener => ctx.on('connection/reset', listener),
      })
      // Every command carries the revision it read, so a stale panel fails instead of overwriting a newer task.
      const command = async (action: (item: WorkItem) => Promise<RemoteResult<WorkItem>>, expected?: WorkflowTaskRef): Promise<WorkflowCommandResult> => {
        if (workflowRemote === undefined) return { ok: false, message: 'Coding workflow remote unavailable' }
        const item = workflow.getSnapshot().item
        if (item === null) return { ok: false, message: 'No current task' }
        if (expected && (item.taskId !== expected.taskId || item.revision !== expected.revision))
          return { ok: false, message: 'Coding task changed; refresh and retry' }
        try {
          const result = await action(item)
          return result.ok ? { ok: true, ref: { taskId: result.value.taskId, revision: result.value.revision } }
            : { ok: false, message: result.error.message }
        } catch (error) {
          return { ok: false, message: String(error) }
        }
      }
      const goalCommand = async (action: 'pause' | 'resume', goalRef: GoalRef) => {
        const binding = ctx.sessions.binding(sessionId)
        if (binding === undefined || binding.session.getSnapshot().openState !== 'open')
          return { ok: false as const, error: { message: 'Session unavailable' } }
        const projection = binding.session.projections.faceOf('goal').getSnapshot() as GoalProjection | null | undefined
        if (projection == null || projection.goal.id !== goalRef.id || projection.goal.revision !== goalRef.revision)
          return { ok: false as const, error: { message: 'Workflow goal changed; refresh and retry' } }
        return ctx.remote.goals[action](sessionId, goalRef)
      }
      return {
        hooks: { actionForm: form, workflow },
        todoStaleMs: deployment.todoStaleMs,
        saveLayout: (json, rev) => form.mutate([{ op: 'set', path: ['layoutJson'], value: json }], rev),
        workflowCommands: {
          approve: (decision, ref) => command(item => workflowRemote.approve(sessionId, item.taskId, item.revision, decision), ref),
          pause: ref => command(item => workflowRemote.pause(sessionId, item.taskId, item.revision), ref),
          resume: ref => command(item => workflowRemote.resume(sessionId, item.taskId, item.revision), ref),
          cancel: (reason, ref) => command(item => workflowRemote.cancel(sessionId, item.taskId, item.revision, reason), ref),
          setMode: (mode, ref) => command(item => workflowRemote.setMode(sessionId, item.taskId, item.revision, mode), ref),
        },
        pauseWorkflow: goalRef => goalCommand('pause', goalRef),
        resumeWorkflow: goalRef => goalCommand('resume', goalRef),
        fetchSkillNames: async () => {
          if (ctx.sessions.binding(sessionId) === undefined) throw new Error('Session unavailable')
          return ctx.sessions.using(sessionId,{ source:'mattSkillLauncher' },async (ref)=>{
            if (ref.binding.session.getSnapshot().openState !== 'open') throw new Error('Session not open')
            const result = await ctx.remote.skills.list({ sessionId })
            if (!result.ok) throw new Error(result.error.message)
            return result.value.skills.map(skill=>skill.name)
          })
        },
      }
    },
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
