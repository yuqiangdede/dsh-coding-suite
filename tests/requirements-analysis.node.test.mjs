import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve, dirname, join, isAbsolute, sep } from 'node:path'
import { runInNewContext } from 'node:vm'
import { parse as parseYaml } from 'yaml'
import { DEFAULT_ACTIONS, encodeActions, parseActions, missingDefaultActions, presentDefaultActions } from '../src/client/actions.ts'
import { LAUNCHER_GROUPS, defaultLauncherLayout, parseLauncherLayout, actionsForGroup, exportLauncherConfiguration, importedLauncherLayout } from '../src/client/launcher-layout.ts'
import { recommend, actionIntent, withEvidence } from '../src/client/contextual-actions.ts'
import { zh, en } from '../src/client/locales.ts'

const groupId = 'requirements-analysis'
const stageIds = ['product-risk-gate', 'product-module-gate', 'product-state-gate', 'product-exception-gate', 'product-prd-pages', 'product-consistency-gate', 'product-image-prompt']
const newIds = [...stageIds, 'requirement-clarification', 'requirement-analysis', 'solution-design', 'prd-writing', 'requirement-review', 'product-development-pipeline']
const root = resolve(import.meta.dirname, '..')
const client = readFileSync(resolve(root, 'lib/client.js'), 'utf8')
const start = client.indexOf('//#region lib/types/client/contextual-actions.js')
const end = client.indexOf('//#endregion', start)
assert(start >= 0 && end > start)
const publishedRecommend = runInNewContext(client.slice(start, end) + '\nrecommend')
const reply = (id, text, options = {}) => {
  const entries = [
  { role: 'user', text: '/' + id, seq: 1 },
  { role: 'assistant', text, seq: 2, ...options },
  ]
  const source = recommend(entries, false, DEFAULT_ACTIONS)
  assert.deepEqual(JSON.parse(JSON.stringify(publishedRecommend(entries, false, DEFAULT_ACTIONS))), source)
  return source
}

test('new group follows the full pipeline to image prompts while preserving existing spec and visual actions', () => {
  assert.equal(LAUNCHER_GROUPS[0].id, groupId)
  const layout = defaultLauncherLayout(DEFAULT_ACTIONS)
  const grouped = actionsForGroup(groupId, DEFAULT_ACTIONS, layout)
  assert.deepEqual(grouped.map(a => a.id), ['product-development-pipeline', 'requirement-clarification', 'requirement-analysis', stageIds[0], 'solution-design', ...stageIds.slice(1)])
  for (const id of ['spec', 'visual']) assert(actionsForGroup('development', DEFAULT_ACTIONS, layout).includes(DEFAULT_ACTIONS.find(a => a.id === id)))
  assert.equal(layout.visibleGroups[groupId], true)
  assert(!newIds.some(id => layout.commonActionIds.includes(id)))
  assert.equal(zh.groupRequirementsAnalysis, '需求')
  assert.equal(en.groupRequirementsAnalysis, 'Requirements')
})

test('old layout gains a hidden group; malformed existing and new fields still fail', () => {
  const old = { schemaVersion: 1, visibleGroups: { common: false, development: false, documents: true, others: false }, commonActionIds: ['custom'] }
  const parsed = parseLauncherLayout(JSON.stringify(old), DEFAULT_ACTIONS)
  assert.deepEqual(parsed.visibleGroups, { ...old.visibleGroups, [groupId]: false })
  assert.deepEqual(parsed.commonActionIds, old.commonActionIds)
  for (const value of [null, 0, 'true', [], {}]) {
    assert.throws(() => parseLauncherLayout(JSON.stringify({ ...old, visibleGroups: { ...old.visibleGroups, [groupId]: value } }), DEFAULT_ACTIONS))
  }
  for (const key of ['development', 'documents', 'others']) {
    const broken = { ...old.visibleGroups }; delete broken[key]
    assert.throws(() => parseLauncherLayout(JSON.stringify({ ...old, visibleGroups: broken }), DEFAULT_ACTIONS))
  }
  for (const value of [true, false]) {
    const changed = { ...parsed, visibleGroups: { ...parsed.visibleGroups, [groupId]: value } }
    const exported = exportLauncherConfiguration(encodeActions(DEFAULT_ACTIONS), changed)
    assert.deepEqual(importedLauncherLayout(exported, DEFAULT_ACTIONS, parsed), changed)
    assert.deepEqual(parseActions(exported), DEFAULT_ACTIONS)
  }
})

test('saved custom presets survive parsing; opt-in additions are unique and translated', () => {
  const custom = DEFAULT_ACTIONS.filter(a => !newIds.includes(a.id)).map(a => a.id === 'spec' ? { ...a, label: '我的规格', prompt: '我的原提示词', enabled: false, order: 999 } : { ...a })
  assert.deepEqual(parseActions(encodeActions(custom)), custom)
  const missing = missingDefaultActions(custom)
  assert.deepEqual(missing.map(a => a.id), newIds)
  const filled = [...custom, ...presentDefaultActions(missing, true)]
  assert.deepEqual(missingDefaultActions(filled), [])
  assert.deepEqual(filled.find(a => a.id === 'spec'), custom.find(a => a.id === 'spec'))
  assert.equal(filled.find(a => a.id === 'prd-writing').label, 'Write PRD')
})

test('explicit stage outcomes advance or return only to the relevant requirements stage', () => {
  for (const [id, marker, next] of [
    ['requirement-clarification', 'READY_FOR_ANALYSIS', 'requirement-analysis'],
    ['requirement-analysis', 'READY_FOR_SOLUTION', 'product-risk-gate'],
    ['requirement-analysis', 'BACK_TO_CLARIFICATION', 'requirement-clarification'],
    ['solution-design', 'READY_FOR_PRD', 'product-module-gate'],
    ['prd-writing', 'READY_FOR_REVIEW', 'requirement-review'],
    ['prd-writing', 'BACK_TO_SOLUTION', 'solution-design'],
    ['product-prd-pages', 'READY_FOR_CONSISTENCY', 'product-consistency-gate'],
  ]) {
    assert.deepEqual(reply(id, '阶段结论：' + marker)?.ids, [next])
    assert.deepEqual(reply(id, '**Stage outcome: ' + marker + '**')?.ids, [next])
    assert.equal(reply(id, '阶段结论：' + marker, { failed: true }), null)
  }
  assert.equal(reply('solution-design', '阶段结论：NEEDS_DECISION'), null)
  assert.equal(reply('solution-design', '阶段结论：toString'), null)
  assert.equal(reply('product-development-pipeline', '阶段结论：READY_FOR_REVIEW'), null)
})

test('review GO is explicit; negations, mentions, conflicts and conditions never advance to coding', () => {
  assert.deepEqual(reply('requirement-review', '需求评审结论：GO')?.ids, ['product-prd-pages'])
  assert.deepEqual(reply('requirement-review', 'Requirements review outcome: GO')?.ids, ['product-prd-pages'])
  for (const text of [
    '无 S0，不是 NO-GO，可讨论', '并未 GO，必须补充',
    '需求评审结论：不是 NO-GO', '需求评审结论：NO-GO',
    '需求评审结论：CONDITIONAL GO',
    '需求评审结论：GO\n需求评审结论：NO-GO',
    '需求评审结论：GO\n需求评审结论：未知',
    '未来可输出需求评审结论：GO',
    '```example\n需求评审结论：GO\n```',
    '> 需求评审结论：GO',
    '需求评审结论：GO\n回退阶段：prd-writing',
  ]) assert.equal(reply('requirement-review', text), null, text)
  assert.deepEqual(reply('requirement-review', '需求评审结论：NO-GO\n回退阶段：solution-design')?.ids, ['solution-design'])
  assert.deepEqual(reply('requirement-review', 'Requirements review outcome: CONDITIONAL GO\nReturn stage: prd-writing')?.ids, ['prd-writing'])
  assert.equal(reply('requirement-review', '需求评审结论：NO-GO\n回退阶段：execute'), null)
  assert.equal(actionIntent('/requirement-review-custom', DEFAULT_ACTIONS), null)
  assert.equal(reply('requirement-review', '需求评审结论：GO', { failed: true }), null)
})

test('main pipeline recommendations retain all gates and finish at the image prompt endpoint', () => {
  const gates = [
    ['product-risk-gate', 'solution-design'], ['product-module-gate', 'product-state-gate'],
    ['product-state-gate', 'product-exception-gate'], ['product-exception-gate', 'product-prd-pages'],
    ['product-consistency-gate', 'product-image-prompt'],
  ]
  for (const [id, next] of gates) {
    assert.deepEqual(reply(id, '阶段 Gate：PASS')?.ids, [next])
    assert.equal(reply(id, '阶段 Gate：CONDITIONAL PASS'), null)
    assert.equal(reply(id, '阶段 Gate：FAIL'), null)
    assert.equal(reply(id, '没有 FAIL，也没有 S0；未来可以 PASS'), null)
    assert.equal(reply(id, '阶段 Gate：PASS\n阶段 Gate：FAIL'), null)
    assert.deepEqual(reply(id, 'Stage gate: FAIL\nReturn stage: solution-design')?.ids, ['solution-design'])
  }
  assert.equal(reply('product-prd-pages', '阶段 Gate：FAIL\n阶段结论：READY_FOR_CONSISTENCY'), null)
  assert.equal(reply('product-image-prompt', '阶段结论：UI_PROMPT_READY'), null)
  const action = DEFAULT_ACTIONS.find(a => a.id === 'product-development-pipeline')
  assert(action.prompt.includes('一直推进到最终 UI 生图提示词'))
  assert(action.prompt.includes('不实际生图'))
})

function settingsHarness(actions, english = false) {
  let registration, Settings, cursor = 0
  const values = [], dependencies = [], effects = [], events = []
  const jsx = (type, props) => ({ type, props })
  const react = {
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value }] },
    useRef(initial) { const i = cursor++; return values[i] ??= { current: initial } },
    useEffect(fn, deps) { const i = cursor++; if (!dependencies[i] || deps.some((value, n) => value !== dependencies[i][n])) effects.push(fn); dependencies[i] = deps },
  }
  runInNewContext(client, { window: { __ModuleLoader__: { load: value => { registration = value } } } })
  registration.factory(name => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {}).apply({
    effect: fn => fn(), locale: { register() {}, bind: () => key => key },
    configForms: { get: () => ({}) }, sessions: {}, remote: {},
    slots: { inject: (_, fn) => fn(), register: (options, component) => { if (options.name === 'settings.section') Settings = component } },
  })
  const dictionary = english ? en : zh
  const data = { revision: 1, writable: true, status: 'ready', value: { actionsJson: encodeActions(actions), layoutJson: JSON.stringify({ schemaVersion: 1, visibleGroups: { development: true, documents: false, others: false }, commonActionIds: ['spec'] }) } }
  const render = () => { cursor = 0; const tree = Settings({ useActionForm: fn => fn(data), t: key => dictionary[key] ?? key,
    saveConfiguration: async (actionsJson, layoutJson, revision) => { events.push({ actionsJson, layoutJson, revision }); data.value = { actionsJson, layoutJson }; data.revision++; return true },
  }); for (const fn of effects.splice(0)) fn(); return tree }
  const nodes = value => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)]
  const button = key => nodes(render()).find(node => node.type === 'button' && node.props.children === dictionary[key])
  render()
  return { render, nodes, button, events, data }
}

test('published settings opt-in preserves custom content, translates additions and persists migrated visibility', async () => {
  const old = DEFAULT_ACTIONS.filter(a => !newIds.includes(a.id)).map(a => a.id === 'spec' ? { ...a, label: '我的规格', prompt: '保留自定义正文' } : a)
  const h = settingsHarness(old, true)
  h.button('fillMissing').props.onClick()
  assert.equal(h.events.length, 0)
  assert(h.nodes(h.render()).some(node => node.type === 'input' && node.props.value === 'Requirements Pipeline'))
  await h.button('save').props.onClick()
  assert.equal(h.events.length, 1)
  const saved = parseActions(h.events[0].actionsJson)
  assert.deepEqual(saved.find(a => a.id === 'spec'), old.find(a => a.id === 'spec'))
  assert.equal(saved.length, DEFAULT_ACTIONS.length)
  assert.equal(JSON.parse(h.events[0].layoutJson).visibleGroups[groupId], false)
  assert.equal(h.events[0].revision, 1)
})

test('published settings rejects preset fill above 100 without discarding or saving custom actions', () => {
  const actions = Array.from({ length: 100 }, (_, i) => ({ ...DEFAULT_ACTIONS[0], id: 'custom-' + i }))
  const h = settingsHarness(actions)
  h.button('fillMissing').props.onClick()
  assert.equal(h.events.length, 0)
  assert(h.nodes(h.render()).some(node => node.props?.role === 'alert' && node.props.children === zh.errorVersion))
  assert.equal(h.button('save').props.disabled, true)
  assert.deepEqual(parseActions(h.data.value.actionsJson), actions)
})

test('new action drafts receive artifact handoffs without copying conversation content', () => {
  for (const id of newIds) {
    const action = DEFAULT_ACTIONS.find(a => a.id === id)
    for (const english of [true, false]) {
      const input = '/' + action.skillId + '\n' + action.prompt
      const draft = withEvidence(input, null, id, [], english)
      assert(draft.startsWith('/' + id + '\n'))
      assert(draft.length > input.length)
    }
  }
})

test('flat bundled product skills include all dependencies, license and valid local Markdown links', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'assets/skills/product-development-source.json'), 'utf8'))
  assert.equal(manifest.skills.length, 10)
  assert.match(manifest.revision, /^[0-9a-f]{40}$/)
  assert.equal(manifest.license, 'Apache-2.0')
  assert.match(readFileSync(resolve(root, 'assets/skills', manifest.licenseFile), 'utf8'), /Apache License/)
  for (const skill of manifest.skills) {
    const source = readFileSync(resolve(root, 'assets/skills', skill, 'SKILL.md'), 'utf8')
    assert(source.includes('name: ' + skill))
    assert(source.includes('../_shared/PRODUCT_DEVELOPMENT.md'))
  }
  assert.equal(existsSync(resolve(root, 'assets/skills/product-development-skills')), false)
  const paths = [...manifest.files.map(f => f.path), ...stageIds.map(id => 'assets/skills/' + id + '/SKILL.md'), 'assets/skills/_shared/PRODUCT_DEVELOPMENT.md']
  for (const path of paths) {
    assert(existsSync(resolve(root, path)), path)
    if (!path.endsWith('.md')) continue
    const source = readFileSync(resolve(root, path), 'utf8')
    for (const match of source.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0]
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue
      assert(existsSync(resolve(root, dirname(path), decodeURIComponent(target))), path + ': ' + target)
    }
  }
  assert.equal(readdirSync(resolve(root, 'assets/skills/product-development-pipeline/steps')).length, 10)
})

test('shipped Host provider discovers and loads the flat product skill catalog with resource bases', async () => {
  const bundle = readFileSync(resolve(root, 'lib/index.js'), 'utf8')
  const start = bundle.indexOf('//#region lib/types/skill-provider.js')
  const end = bundle.indexOf('//#endregion', start)
  assert(start >= 0 && end > start)
  const register = runInNewContext(bundle.slice(start, end).replaceAll('import.meta.url', JSON.stringify(new URL('../lib/index.js', import.meta.url).href)) + '\nregisterCodingSuiteSkills', {
    existsSync, readdirSync, readFileSync, readFile, resolve, join, isAbsolute, sep, parse: parseYaml,
  })
  let provider
  const dispose = () => {}
  assert.equal(register({ skills: { registerProvider: factory => { provider = factory(); return dispose } } }, { assetRoot: resolve(root, 'assets/skills') }), dispose)
  const catalog = await provider.list()
  const manifest = JSON.parse(readFileSync(resolve(root, 'assets/skills/product-development-source.json'), 'utf8'))
  for (const name of [...manifest.skills, ...manifest.localStageSkills]) {
    const candidate = catalog.find(skill => skill.name === name)
    assert(candidate, name)
    const loaded = await provider.get(candidate, {})
    assert(loaded.content.includes('PRODUCT_DEVELOPMENT.md'))
    assert.equal(loaded.resourceBase.path, resolve(root, 'assets/skills', name).split(sep).join('/'))
    assert.equal(loaded.invocation.userInvocable, true)
    assert(!loaded.content.startsWith('---'))
  }
})
