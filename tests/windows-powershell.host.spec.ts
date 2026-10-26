import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { registerWindowsPowerShellGuidance } from '../src/windows-powershell.ts'
import { registerWindowsPowerShellGuidance as registerPackagedGuidance } from '../lib/windows-powershell.js'
import { registerCodingSuiteSkills } from '../src/skill-provider.ts'

const contexts: Context[] = []
afterEach(async () => {
  for (const ctx of contexts.splice(0)) await ctx.fiber.dispose()
})

describe.each([
  ['source', registerWindowsPowerShellGuidance],
  ['packaged', registerPackagedGuidance],
] as const)('Windows PowerShell guidance (%s)', (_label, registerGuidance) => {
  it.each(['win32', 'linux', 'darwin'] as const)('contributes only on Windows and cleans up on unload (%s)', async platform => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SystemPrompt, {})
    ctx.systemPrompt.section({ name: 'existing', order: 0, text: 'Existing host instructions' })
    const before = await ctx.systemPrompt.assemble()
    const plugin = ctx.plugin(Object.assign((child: Context) => registerGuidance(child, platform), { inject: ['systemPrompt'] }))
    await plugin
    const assembly = await ctx.systemPrompt.assemble()
    expect(assembly.sections.some(section => section.name === 'existing')).toBe(true)
    const guidance = assembly.sections.filter(section => section.name === 'coding-suite:windows-powershell')
    expect(guidance).toHaveLength(platform === 'win32' ? 1 : 0)
    if (platform === 'win32') {
      expect(guidance[0]?.text).toContain('windows-powershell')
      expect(guidance[0]?.text).toContain('$LASTEXITCODE')
      expect((await ctx.systemPrompt.assemble()).sections.filter(section => section.name === 'coding-suite:windows-powershell')).toHaveLength(1)
    }
    await plugin.dispose()
    expect((await ctx.systemPrompt.assemble()).sections).toEqual(before.sections)
  })

  it('discovers and loads the bundled diagnostic skill and removes it on disposal', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SkillRegistry)
    const dispose = registerCodingSuiteSkills(ctx)
    const candidate = (await ctx.skills.list()).find(skill => skill.name === 'windows-powershell')
    expect(candidate?.description).toMatch(/PowerShell/)
    expect(candidate?.invocation).toEqual({ modelInvocable: true, userInvocable: true })
    const skill = await ctx.skills.get('windows-powershell')
    expect(skill?.content).toContain('$LASTEXITCODE')
    expect(skill?.content).toContain('ConstrainedLanguage')
    expect(skill?.content).toContain('diagnose-windows-sandbox-acl')
    dispose()
    expect((await ctx.skills.list()).some(skill => skill.name === 'windows-powershell')).toBe(false)
  })
})
