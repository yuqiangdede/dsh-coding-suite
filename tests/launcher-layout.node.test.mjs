import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_ACTIONS, encodeActions, parseActions } from '../src/client/actions.ts'
import { DEFAULT_COMMON_IDS, LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout,
  parseLauncherLayout, exportLauncherConfiguration, importedLauncherLayout } from '../src/client/launcher-layout.ts'

test('four group IDs, defaults, and ordered button references', () => {
  const layout = defaultLauncherLayout(DEFAULT_ACTIONS)
  assert.deepEqual(layout.commonActionIds, [...DEFAULT_COMMON_IDS])
  assert.deepEqual(Object.entries(layout.visibleGroups), [
    ['development', true], ['documents', false], ['others', false],
  ])
  assert.deepEqual(LAUNCHER_GROUPS.map(g => g.actionIds.length), [11, 7, 12])
  assert.deepEqual(actionsForGroup('common', DEFAULT_ACTIONS, layout).map(a => a.id), [...DEFAULT_COMMON_IDS])
  assert.equal(actionsForGroup('documents', DEFAULT_ACTIONS, layout).length, 7)
  assert.equal(actionsForGroup('others', DEFAULT_ACTIONS, layout).length, 12)
  assert.equal(actionsForGroup('common', DEFAULT_ACTIONS, layout)[0], DEFAULT_ACTIONS.find(a => a.id === 'bug'))
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
