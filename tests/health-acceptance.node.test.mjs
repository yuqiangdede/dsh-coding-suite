import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_ACTIONS, ENGLISH_DEFAULT_PRESENTATION, parseActions, encodeActions, missingDefaultActions, presentDefaultActions } from '../src/client/actions.ts'
import { readFileSync, existsSync } from 'node:fs'

test('shipped browser action tables match the source presets', () => {
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const [name, value] of Object.entries({ DEFAULT_ACTIONS, ENGLISH_DEFAULT_PRESENTATION })) {
    const pattern = new RegExp(`\\t\\tconst ${name} = ([\\s\\S]*?\\n\\t\\t[\\]}]);`, 'g')
    const matches = [...bundle.matchAll(pattern)]
    assert.equal(matches.length, 1, name)
    assert.deepEqual(JSON.parse(matches[0][1]), value, name)
  }
})

const root = new URL('../assets/skills/project-runtime-acceptance/', import.meta.url)
test('health acceptance is an enabled read-only skill shortcut', () => {
  const action = DEFAULT_ACTIONS.find(a => a.id === 'health-acceptance')
  assert.ok(action)
  assert.equal(action.label, '健康验收')
  assert.equal(action.kind, 'skill')
  assert.equal(action.skillId, 'project-runtime-acceptance')
  assert.equal(action.enabled, true)
  assert.equal(action.pinned, true)
  for (const boundary of ['静态只读', '不修改', '不提交', '未覆盖', '报告路径']) assert.ok(action.prompt.includes(boundary), boundary)
  assert.equal(presentDefaultActions([{ ...action }], true)[0].label, 'Health Acceptance')
})
test('existing settings remain unchanged and can opt into the missing preset once', () => {
  const previous = DEFAULT_ACTIONS.filter(a => a.id !== 'health-acceptance').map(a => ({ ...a, label: '自定义 ' + a.label }))
  const loaded = parseActions(encodeActions(previous))
  assert.deepEqual(loaded, previous)
  const missing = missingDefaultActions(loaded)
  assert.deepEqual(missing.map(a => a.id), ['health-acceptance'])
  assert.deepEqual(missingDefaultActions([...loaded, ...missing]), [])
  assert.deepEqual(parseActions(encodeActions([])), [])
})
test('bundled health skill includes all domain rules, report templates and scanner tests', () => {
  const skill = readFileSync(new URL('SKILL.md', root), 'utf8')
  assert.match(skill, /name: project-runtime-acceptance/)
  for (const name of ['database', 'scheduler', 'cache', 'api-calls', 'storage', 'async-tasks', 'concurrency', 'performance', 'resources', 'deployment', 'recovery', 'security-observability']) {
    assert.ok(existsSync(new URL(`references/${name}.md`, root)), name)
  }
  for (const name of ['assets/acceptance-report.md', 'assets/remediation-plan.md', 'assets/project-policy.example.md', 'scripts/inventory.py', 'scripts/test_inventory.py']) assert.ok(existsSync(new URL(name, root)), name)
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.ok(pkg.files.includes('assets/**/*'))
})
