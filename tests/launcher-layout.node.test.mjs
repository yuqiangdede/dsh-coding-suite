import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_ACTIONS, encodeActions, parseActions } from '../src/client/actions.ts'
import { DEFAULT_COMMON_IDS, LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout,
  fittedActionCount, parseLauncherLayout, exportLauncherConfiguration, importedLauncherLayout } from '../src/client/launcher-layout.ts'

test('five group IDs, defaults, and ordered button references', () => {
  const layout = defaultLauncherLayout(DEFAULT_ACTIONS)
  assert.deepEqual(layout.commonActionIds, [...DEFAULT_COMMON_IDS])
  assert.deepEqual(Object.entries(layout.visibleGroups), [
    ['common', true], ['requirements-analysis', true], ['development', true], ['documents', false], ['others', false],
  ])
  assert.deepEqual(LAUNCHER_GROUPS.map(g => g.actionIds.length), [11, 15, 7, 16])
  assert.deepEqual(actionsForGroup('common', DEFAULT_ACTIONS, layout).map(a => a.id), [...DEFAULT_COMMON_IDS])
  assert.equal(actionsForGroup('documents', DEFAULT_ACTIONS, layout).length, 7)
  const others = actionsForGroup('others', DEFAULT_ACTIONS, layout).map(a => a.id)
  assert.equal(others.length, 16)
  assert.deepEqual(others.slice(1, 3), ['graphify-navigation', 'graphify-refresh'])
  assert.equal(actionsForGroup('common', DEFAULT_ACTIONS, layout)[0], DEFAULT_ACTIONS.find(a => a.id === 'bug'))
})

test('fitted rows reserve the More button only when the remaining buttons do not fit', () => {
  assert.equal(fittedActionCount([], 300, 5, 70), 0)
  assert.equal(fittedActionCount([50, 50], 105, 5, 70), 2, 'exact fit needs no More')
  assert.equal(fittedActionCount([50, 50, 50, 50], 215, 5, 70), 4, 'whole row fits')
  assert.equal(fittedActionCount([50, 50, 50, 50], 200, 5, 70), 2, 'reserves gap and More width')
  assert.equal(fittedActionCount([50, 50, 50, 50], 180, 5, 70), 2, 'exact room for two buttons plus More')
  assert.equal(fittedActionCount([50, 50, 50, 50], 179, 5, 70), 1, 'one pixel short still reserves More')
  assert.equal(fittedActionCount([50, 50], 40, 5, 70), 0, 'nothing fits beside More')
  assert.equal(fittedActionCount([50, 50, 50], 100, 5, 0), 1, 'unknown More width still degrades')
})

test('legacy pinned values migrate without discarding customized common lists', () => {
  assert.deepEqual(defaultLauncherLayout(DEFAULT_ACTIONS, true).commonActionIds, [...DEFAULT_COMMON_IDS])
  const customized = DEFAULT_ACTIONS.map(a => ({ ...a, pinned: ['commit', 'prototype'].includes(a.id) }))
  assert.deepEqual(defaultLauncherLayout(customized, true).commonActionIds, ['prototype', 'commit'])
})

test('visibility persists separately from action prompts; old JSON remains importable', () => {
  const layout = parseLauncherLayout(undefined, DEFAULT_ACTIONS)
  const modified = { ...layout, visibleGroups: { ...layout.visibleGroups, documents: true } }
  assert.deepEqual(parseLauncherLayout(JSON.stringify(modified), DEFAULT_ACTIONS), modified)
  const legacy = { ...modified, visibleGroups: { ...modified.visibleGroups, bugfix: true } }
  assert.deepEqual(parseLauncherLayout(JSON.stringify(legacy), DEFAULT_ACTIONS), modified)
  const exported = exportLauncherConfiguration(encodeActions(DEFAULT_ACTIONS), modified)
  assert.deepEqual(parseActions(exported), DEFAULT_ACTIONS)
  assert.deepEqual(importedLauncherLayout(exported, DEFAULT_ACTIONS, layout), modified)
  assert.deepEqual(importedLauncherLayout(encodeActions(DEFAULT_ACTIONS), DEFAULT_ACTIONS, layout), layout)
})

test('disabled buttons remain hidden and custom buttons remain reachable', () => {
  const layout = defaultLauncherLayout(DEFAULT_ACTIONS)
  const disabled = DEFAULT_ACTIONS.map(a => a.id === 'commit' ? { ...a, enabled: false } : a)
  assert(!actionsForGroup('common', disabled, layout).some(a => a.id === 'commit'))
  const custom = { ...DEFAULT_ACTIONS[0], id: 'user-button', label: '自定义', enabled: true }
  assert.equal(actionsForGroup('others', [...DEFAULT_ACTIONS, custom], layout).at(-1), custom)
})

test('invalid saved layouts fail closed', () => {
  for (const broken of ['{broken', '{}',
    '{"schemaVersion":2,"visibleGroups":{},"commonActionIds":[]}',
    '{"schemaVersion":1,"visibleGroups":{"development":true,"documents":false,"others":false},"commonActionIds":["bug","bug"]}',
  ]) assert.throws(() => parseLauncherLayout(broken, DEFAULT_ACTIONS))
})

test('common visibility defaults on for old layouts and round trips explicit choices', () => {
  const old = { schemaVersion: 1, commonActionIds: ['bug'], visibleGroups: { development: false, documents: true, others: false } }
  const migrated = parseLauncherLayout(JSON.stringify(old), DEFAULT_ACTIONS)
  assert.deepEqual(migrated.visibleGroups, { common: true, 'requirements-analysis': false, ...old.visibleGroups })
  const hidden = { ...migrated, visibleGroups: { ...migrated.visibleGroups, common: false } }
  assert.deepEqual(parseLauncherLayout(JSON.stringify(hidden), DEFAULT_ACTIONS), hidden)
  assert.deepEqual(importedLauncherLayout(exportLauncherConfiguration(encodeActions(DEFAULT_ACTIONS), hidden), DEFAULT_ACTIONS, migrated), hidden)
  assert.throws(() => parseLauncherLayout(JSON.stringify({ ...old, visibleGroups: { ...old.visibleGroups, common: null } }), DEFAULT_ACTIONS))
})
