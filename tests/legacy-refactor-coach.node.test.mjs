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
const skillRoot = join(root, 'assets/skills/legacy-refactor-coach')

test('refactor resources have valid metadata and resolvable local reference links', () => {
  const entry = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8')
  const metadata = parseYaml(entry.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1])
  assert.equal(metadata.name, 'legacy-refactor-coach')
  assert.ok(metadata.description.length > 20)
  const references = readdirSync(join(skillRoot, 'references'))
  assert.equal(references.length, 9)
  for (const name of references) {
    assert.ok(entry.includes(`references/${name}`), name)
    assert.ok(readFileSync(join(skillRoot, 'references', name), 'utf8').trim().length > 100)
  }
  for (const link of entry.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
    assert.ok(existsSync(join(skillRoot, link[1])), link[1])
  }
})

test('shipped provider loads refactor with its resource directory and shared artifact routing', async () => {
  const bundle = readFileSync(join(root, 'lib/index.js'), 'utf8')
  const start = bundle.indexOf('//#region lib/types/skill-provider.js')
  const end = bundle.indexOf('//#endregion', start)
  assert.ok(start >= 0 && end > start)
  const register = runInNewContext(bundle.slice(start, end).replaceAll('import.meta.url', JSON.stringify(new URL('../lib/index.js', import.meta.url).href)) + '\nregisterCodingSuiteSkills', {
    existsSync, readdirSync, readFileSync, readFile, resolve, join, isAbsolute, sep, fileURLToPath, URL, parse: parseYaml,
  })
  let provider
  register({ skills: { registerProvider: factory => { provider = factory() } } }, { assetRoot: join(root, 'assets/skills') })
  const candidate = (await provider.list()).find(skill => skill.name === 'legacy-refactor-coach')
  assert.ok(candidate)
  const loaded = await provider.get(candidate, {})
  assert.equal(loaded.resourceBase.path, skillRoot.split(sep).join('/'))
  assert.equal(loaded.invocation.userInvocable, true)
  assert.equal(loaded.invocation.modelInvocable, true)
  assert.ok(loaded.content.includes('references/workflow.md'))
  const routing = readFileSync(join(root, 'assets/skills/_shared/ARTIFACT_LAYOUT.md'), 'utf8').trim()
  assert.ok(loaded.content.endsWith(routing))
})

test('saved actions retain customization and offer the missing refactor preset exactly once', () => {
  const action = DEFAULT_ACTIONS.find(action => action.id === 'refactor')
  assert.equal(action.skillId, 'legacy-refactor-coach')
  const saved = DEFAULT_ACTIONS.filter(action => action.id !== 'refactor')
  saved[0] = { ...saved[0], prompt: '用户自己的提示词' }
  const loaded = parseActions(encodeActions(saved))
  assert.deepEqual(loaded, saved)
  assert.ok(missingDefaultActions(loaded).some(action => action.id === 'refactor'))
  const filled = parseActions(encodeActions([...loaded, action]))
  assert.equal(filled.filter(action => action.id === 'refactor').length, 1)
  assert.ok(!missingDefaultActions(filled).some(action => action.id === 'refactor'))
  assert.equal(filled[0].prompt, '用户自己的提示词')
})
