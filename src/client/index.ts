import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import { en, zh, type LauncherLocaleKey } from './locales.ts'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-workspace-files/remote'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { LAUNCHER_CONFIG_GLOBAL, LauncherDeploymentSchema } from '../config.ts'
import { Launcher } from './Launcher.tsx'
import { LauncherSettings } from './Settings.tsx'
import { evaluateProjectSetup, type ProjectSetupReport } from './setup-readiness.ts'
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
  projectRoot: string | undefined
  checkProjectSetup: ()=>Promise<ProjectSetupReport>
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

export const inject = ['locale', 'slots','sessions','remote','remote.skills','remote.workspaceFiles','configForms']
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
    inject: (sessionId): LauncherInjected => ({
        hooks: { actionForm: form },
        todoStaleMs: deployment.todoStaleMs,
        projectRoot: ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
          ?? (ctx.sessions.binding(sessionId)?.session.projections.faceOf('workingDirectory').getSnapshot() as string | null | undefined)
          ?? undefined,
        checkProjectSetup: async () => {
          const root = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
            ?? (ctx.sessions.binding(sessionId)?.session.projections.faceOf('workingDirectory').getSnapshot() as string | null | undefined)
          if (!root) return { ready: false, missing: ['无法识别当前项目工作区'] }
          if (ctx.sessions.binding(sessionId) === undefined) throw new Error('当前 Session 不可用')
          const skills = await ctx.remote.skills.list({ sessionId })
          if (!skills.ok) throw new Error(skills.error.message)
          return evaluateProjectSetup(async path => {
            const pages: string[] = []
            let offset = 1
            let version: string | undefined
            for (;;) {
              const result = await ctx.remote.workspaceFiles.read(sessionId, path, { offset }, new AbortController().signal)
              if (!result.ok) {
                if (offset === 1 && result.error.code === 'workspace-file/not-found') return null
                throw new Error(result.error.message)
              }
              const page = result.value
              if (version !== undefined && page.version !== version) throw new Error('检查期间文件已更改：' + path)
              version = page.version
              pages.push(page.text)
              if (page.eof) return pages.join('\n')
              if (page.lines <= 0) throw new Error('文件读取未前进：' + path)
              offset += page.lines
            }
          }, skills.value.skills.map(skill => skill.name))
        },
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
