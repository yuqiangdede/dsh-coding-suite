import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, join, isAbsolute, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { parse as parseYaml } from 'yaml'
import { DEFAULT_ACTIONS, encodeActions, parseActions, missingDefaultActions } from '../src/client/actions.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const skillRoot = join(root, 'assets/skills/spring7-boot4-upgrade')

test('Spring7 upgrade resources have valid metadata and resolvable local reference links', () => {
  const entry = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
  const metadata = parseYaml(entry.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1])
  assert.equal(metadata.name, 'spring7-boot4-upgrade')
  assert.ok(metadata.description.length > 20)
  const references = readdirSync(join(skillRoot, 'references'))
  assert.equal(references.length, 2)
  for (const name of references) {
    assert.ok(entry.includes(`references/${name}`), name)
    assert.ok(readFileSync(join(skillRoot, 'references', name), 'utf8').trim().length > 100)
  }
  for (const link of entry.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
    assert.ok(existsSync(join(skillRoot, link[1])), link[1])
  }
})

test('shipped provider loads Spring7 upgrade with its resource directory and shared artifact routing', async () => {
  const bundle = readFileSync(join(root, 'lib/index.js'), 'utf8')
  const start = bundle.indexOf('//#region lib/types/skill-provider.js')
  const end = bundle.indexOf('//#endregion', start)
  assert.ok(start >= 0 && end > start)
  const register = runInNewContext(bundle.slice(start, end).replaceAll('import.meta.url', JSON.stringify(new URL('../lib/index.js', import.meta.url).href)) + '\nregisterCodingSuiteSkills', {
    existsSync, readdirSync, readFileSync, readFile, resolve, join, isAbsolute, sep, fileURLToPath, URL, parse: parseYaml,
  })
  let provider
  register({ skills: { registerProvider: factory => { provider = factory() } } }, { assetRoot: join(root, 'assets/skills') })
  const candidate = (await provider.list()).find(skill => skill.name === 'spring7-boot4-upgrade')
  assert.ok(candidate)
  const loaded = await provider.get(candidate, {})
  assert.equal(loaded.resourceBase.path, skillRoot.split(sep).join('/'))
  assert.equal(loaded.invocation.userInvocable, true)
  assert.equal(loaded.invocation.modelInvocable, true)
  assert.ok(loaded.content.includes('references/compatibility-matrix.md'))
  const routing = readFileSync(join(root, 'assets/skills/_shared/ARTIFACT_LAYOUT.md'), 'utf8').trim()
  assert.ok(loaded.content.endsWith(routing))
})

test('saved actions retain customization and offer the missing Spring7 upgrade preset exactly once', () => {
  const action = DEFAULT_ACTIONS.find(action => action.id === 'spring7-upgrade')
  assert.equal(action.skillId, 'spring7-boot4-upgrade')
  const saved = DEFAULT_ACTIONS.filter(action => action.id !== 'spring7-upgrade')
  saved[0] = { ...saved[0], prompt: '用户自己的提示词' }
  const loaded = parseActions(encodeActions(saved))
  assert.deepEqual(loaded, saved)
  assert.ok(missingDefaultActions(loaded).some(action => action.id === 'spring7-upgrade'))
  const filled = parseActions(encodeActions([...loaded, action]))
  assert.equal(filled.filter(action => action.id === 'spring7-upgrade').length, 1)
  assert.ok(!missingDefaultActions(filled).some(action => action.id === 'spring7-upgrade'))
  assert.equal(filled[0].prompt, '用户自己的提示词')
})

test('upgrade preset and receiving instructions require a reviewed plan and human confirmation', async () => {
  const { LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout } = await import('../src/client/launcher-layout.ts')
  const { presentDefaultActions } = await import('../src/client/actions.ts')
  const { receivingInstructions } = await import('../src/client/locales.ts')
  const action = DEFAULT_ACTIONS.find(a => a.id === 'spring7-upgrade')
  assert.equal(action.label, '升级 Spring7')
  assert.equal(action.enabled, true)
  assert.equal(presentDefaultActions([action], true)[0].label, 'Upgrade Spring7')
  for (const phrase of ['只读识别', '逐文件改动位置', '等待人工明确确认后', '回滚', '实质范围变化重新确认']) assert.ok(action.prompt.includes(phrase), phrase)
  assert.match(receivingInstructions[action.id][0], /等待人工明确确认后/)
  assert.match(receivingInstructions[action.id][1], /Wait for explicit human confirmation/)
  const ids = [...LAUNCHER_GROUPS.find(g => g.id === 'development').actionIds]
  assert.equal(ids[ids.indexOf(action.id) + 1], 'tdd')
  assert.equal(actionsForGroup('development', DEFAULT_ACTIONS, defaultLauncherLayout(DEFAULT_ACTIONS)).filter(a => a.id === action.id).length, 1)
  const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
  for (const phrase of ['等待人工确认', '已明确确认的范围可继续执行', '`resume` 必须核对已有确认记录', 'docs/_work/<task-id>/', '正式交付文档复用原权威路径']) assert.ok(skill.includes(phrase), phrase)
  assert.ok(!skill.includes('所有报告写入项目内'))
  assert.ok(!skill.includes('再按独立检查点实施安全变更'))
  const manifest = JSON.parse(readFileSync(join(skillRoot, 'source-manifest.json'), 'utf8'))
  assert.equal(manifest.packageSha256.length, 64)
  for (const item of manifest.assets.filter(item => item.upstreamSha256)) {
    assert.ok(existsSync(join(root, item.baseline)))
    const { createHash } = await import('node:crypto')
    assert.equal(createHash('sha256').update(readFileSync(join(root, item.baseline))).digest('hex'), item.upstreamSha256)
  }
})
