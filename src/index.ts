/**
 * @deepseek-ai/dsh-coding-suite
 *
 * Integrated Coding Suite: bundled engineering skills and Pocket specifications,
 * and interactive Web/Desktop UI Launcher.
 *
 * @module @deepseek-ai/dsh-coding-suite
 */

import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { LAUNCHER_CONFIG_GLOBAL, LauncherDeploymentFields, type LauncherDeployment } from './config.ts'
import { registerCodingSuiteSkills, type CodingSuiteSkillConfig } from './skill-provider.ts'
import { registerWindowsPowerShellGuidance } from './windows-powershell.ts'

export * from './skill-provider.ts'

/** Unified configuration for the Coding Suite. */
export interface CodingSuiteConfig extends LauncherDeployment, CodingSuiteSkillConfig {
  /** Versioned CodingAction document kept by DSH Settings. */
  actionsJson?: Volatile<string | undefined>
  /** Versioned button layout, independent of action prompts and Skill IDs. */
  layoutJson?: Volatile<string | undefined>
  /** Optional custom assets root directory for skills. */
  assetRoot?: string
}

export type Config = CodingSuiteConfig

export const Config = z.object({
  actionsJson: z.string().volatile(),
  layoutJson: z.string().volatile(),
  todoStaleMs: LauncherDeploymentFields.todoStaleMs,
  assetRoot: z.string(),
})

export const name = 'coding-suite'

/**
 * Mount the complete Coding Suite on the Host:
 * 1. Bundled engineering skills and Pocket specifications
 * 2. Settings persistence and webserver launcher deployment
 *
 * @param ctx - Host context.
 * @param config - Validated configuration.
 */
export function apply(ctx: Context, config: CodingSuiteConfig): void {
  // 1. Mount Bundled Skills & Pocket Specifications into Skill Registry
  ctx.inject(['skills'], (child) => {
    child.effect(() => registerCodingSuiteSkills(child, {
      ...(config.assetRoot !== undefined ? { assetRoot: config.assetRoot } : {}),
    }))
  })

  // Windows-only model guidance; scoped registration is reclaimed on plugin unload.
  ctx.inject(['systemPrompt'], (child) => registerWindowsPowerShellGuidance(child))

  // 2. Mount Launcher Settings & Index Injections
  ctx.on('webserver/index-inject', (table) => {
    table.push({
      kind: 'global',
      name: LAUNCHER_CONFIG_GLOBAL,
      value: { todoStaleMs: config.todoStaleMs },
    })
  })

  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}

export default {
  name,
  Config,
  apply,
}
