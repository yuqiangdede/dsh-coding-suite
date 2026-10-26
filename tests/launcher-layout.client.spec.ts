import { describe, expect, it } from 'vitest'
import { DEFAULT_ACTIONS, encodeActions, parseActions } from '../src/client/actions.ts'
import {
  LAUNCHER_GROUPS, DEFAULT_COMMON_IDS, actionsForGroup, defaultLauncherLayout,
  parseLauncherLayout, exportLauncherConfiguration, importedLauncherLayout,
} from '../src/client/launcher-layout.ts'

describe('launcher business groups', () => {
  const actions = parseActions(undefined)
  it('uses the requested five groups in fixed order, without copying action definitions', () => {
    const layout = defaultLauncherLayout(actions)
    expect(layout.commonActionIds).toEqual([...DEFAULT_COMMON_IDS])
    expect(LAUNCHER_GROUPS.map(group => group.id)).toEqual(['development', 'bugfix', 'documents', 'others'])
    expect(LAUNCHER_GROUPS.map(group => group.actionIds.length)).toEqual([11, 4, 7, 12])
    expect(actionsForGroup('common', actions, layout).map(a => a.id)).toEqual([...DEFAULT_COMMON_IDS])
    expect(actionsForGroup('development', actions, layout).map(a => a.id)).toEqual([
      'discussion', 'visual', 'spec', 'plan', 'execute', 'review', 'review-fix',
      'compile', 'doc-supplement', 'health-acceptance', 'commit',
    ])
    expect(actionsForGroup('bugfix', actions, layout).map(a => a.id)).toEqual(['bug', 'review-fix', 'compile', 'commit'])
    expect(actionsForGroup('documents', actions, layout)).toHaveLength(7)
    expect(actionsForGroup('others', actions, layout)).toHaveLength(12)
    expect(actionsForGroup('common', actions, layout)[0]).toBe(actions.find(a => a.id === 'bug'))
  })
  it('defaults only development to visible and preserves independent group switches', () => {
    const initial = parseLauncherLayout(undefined, actions)
    expect(initial.visibleGroups).toEqual({ development: true, bugfix: false, documents: false, others: false })
    const changed = { ...initial, visibleGroups: { ...initial.visibleGroups, bugfix: true, development: false } }
    expect(parseLauncherLayout(JSON.stringify(changed), actions)).toEqual(changed)
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
    expect(actionsForGroup('bugfix', disabled, layout).map(a => a.id)).not.toContain('commit')
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
    '{"schemaVersion":1,"visibleGroups":{"development":true,"bugfix":false,"documents":false,"others":false},"commonActionIds":["bug","bug"]}',
    '{"schemaVersion":1,"visibleGroups":{"development":true,"bugfix":null,"documents":false,"others":false},"commonActionIds":[]}',
  ])('rejects corrupt saved layout: %s', source => {
    expect(() => parseLauncherLayout(source, actions)).toThrow()
  })
})
