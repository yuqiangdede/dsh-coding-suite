import { describe, expect, it } from 'vitest'
import { DEFAULT_ACTIONS, encodeActions, parseActions } from '../src/client/actions.ts'
import {
  LAUNCHER_GROUPS, DEFAULT_COMMON_IDS, actionsForGroup, defaultLauncherLayout,
  parseLauncherLayout, exportLauncherConfiguration, importedLauncherLayout,
} from '../src/client/launcher-layout.ts'

describe('launcher business groups', () => {
  const actions = parseActions(undefined)
  it('uses the requested four groups in fixed order, without copying action definitions', () => {
    const layout = defaultLauncherLayout(actions)
    expect(layout.commonActionIds).toEqual([...DEFAULT_COMMON_IDS])
    expect(LAUNCHER_GROUPS.map(group => group.id)).toEqual(['development', 'documents', 'others'])
    expect(LAUNCHER_GROUPS.map(group => group.actionIds.length)).toEqual([14, 7, 12])
    expect(actionsForGroup('common', actions, layout).map(a => a.id)).toEqual([...DEFAULT_COMMON_IDS])
    expect(actionsForGroup('development', actions, layout).map(a => a.id)).toEqual([
      'discussion', 'visual', 'spec', 'plan', 'execute', 'add-logs', 'review', 'review-fix',
      'compile', 'health-acceptance', 'commit', 'doc-supplement',
    ])
    expect(actionsForGroup('documents', actions, layout)).toHaveLength(7)
    expect(actionsForGroup('others', actions, layout)).toHaveLength(12)
    expect(actionsForGroup('common', actions, layout)[0]).toBe(actions.find(a => a.id === 'bug'))
  })
  it('defaults only development to visible and preserves independent group switches', () => {
    const initial = parseLauncherLayout(undefined, actions)
    expect(initial.visibleGroups).toEqual({ common: true, development: true, documents: false, others: false })
    const changed = { ...initial, visibleGroups: { ...initial.visibleGroups, documents: true, development: false } }
    expect(parseLauncherLayout(JSON.stringify(changed), actions)).toEqual(changed)
    const legacy = { ...changed, visibleGroups: { ...changed.visibleGroups, bugfix: true } }
    expect(parseLauncherLayout(JSON.stringify(legacy), actions)).toEqual(changed)
  })
  it('migrates the original pinned preset to the eight requested common buttons', () => {
    expect(defaultLauncherLayout(actions, true).commonActionIds).toEqual([...DEFAULT_COMMON_IDS])
    const customized = actions.map(a => ({ ...a, pinned: a.id === 'prototype' || a.id === 'commit' }))
    expect(defaultLauncherLayout(customized, true).commonActionIds).toEqual(['prototype', 'commit'])
  })
  it('keeps hidden groups distinct from disabled buttons and surfaces unknown custom buttons', () => {
    const layout = defaultLauncherLayout(actions)
    const disabled = actions.map(a => a.id === 'commit' ? { ...a, enabled: false } : a)
    expect(actionsForGroup('common', disabled, layout).map(a => a.id)).not.toContain('commit')
    const extra = { ...actions[0]!, id: 'my-custom', label: '自定义', enabled: true }
    expect(actionsForGroup('others', [...actions, extra], layout).at(-1)).toBe(extra)
  })
  it('roundtrips the full export without breaking v3 action imports', () => {
    const layout = defaultLauncherLayout(actions)
    layout.visibleGroups.documents = true
    const exported = exportLauncherConfiguration(encodeActions(actions), layout)
    expect(parseActions(exported)).toEqual(actions)
    expect(importedLauncherLayout(exported, actions, defaultLauncherLayout(actions))).toEqual(layout)
    expect(importedLauncherLayout(encodeActions(actions), actions, layout)).toEqual(layout)
  })
  it.each([
    '{broken json',
    '{}',
    '{"schemaVersion":2,"visibleGroups":{},"commonActionIds":[]}',
    '{"schemaVersion":1,"visibleGroups":{"development":true,"documents":false,"others":false},"commonActionIds":["bug","bug"]}',
    '{"schemaVersion":1,"visibleGroups":{"development":null,"documents":false,"others":false},"commonActionIds":[]}',
  ])('rejects corrupt saved layout: %s', source => {
    expect(() => parseLauncherLayout(source, actions)).toThrow()
  })
})
