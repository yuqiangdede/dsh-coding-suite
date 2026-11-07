import { test } from 'node:test'
import assert from 'node:assert/strict'
import { actionsForGroup, defaultLauncherLayout, parseLauncherLayout } from '../src/client/launcher-layout.ts'
import { DEFAULT_ACTIONS, presentDefaultActions, parseActions, encodeActions, missingDefaultActions } from '../src/client/actions.ts'

test('temporary logging is a pinned prompt next to bug diagnosis with a bounded cleanup lifecycle', () => {
  const action = DEFAULT_ACTIONS.find(a => a.id === 'add-logs')
  assert.ok(action)
  assert.equal(action.label, '增加日志')
  assert.equal(action.kind, 'prompt')
  assert.equal(action.skillId, undefined)
  assert.equal(action.enabled, true)
  assert.equal(action.pinned, true)
  assert.ok(action.order > DEFAULT_ACTIONS.find(a => a.id === 'bug').order)
  assert.ok(action.order < DEFAULT_ACTIONS.find(a => a.id === 'review').order)
  for (const boundary of ['具体问题', '先询问', '临时诊断日志', '不修复业务逻辑', '脱敏', '限频', 'TEMP-DIAG', '清理清单', '复现步骤', '关闭开关不等于移除', '本会话', '提醒用户', '不承诺跨会话', '不提交或推送']) {
    assert.ok(action.prompt.includes(boundary), boundary)
  }
  assert.equal(presentDefaultActions([{ ...action }], true)[0].label, 'Add Logs')
  assert.deepEqual(parseActions(encodeActions([action])), [action])
})

test('logging shortcut is visible next to diagnosis and available to existing layouts without overwriting them', () => {
  const layout = defaultLauncherLayout(DEFAULT_ACTIONS)
  const common = actionsForGroup('common', DEFAULT_ACTIONS, layout).map(a => a.id)
  assert.equal(common[common.indexOf('bug') + 1], 'add-logs')
  assert.ok(actionsForGroup('development', DEFAULT_ACTIONS, layout).some(a => a.id === 'add-logs'))
  const previous = DEFAULT_ACTIONS.filter(a => a.id !== 'add-logs').map(a => ({ ...a, label: '自定义 ' + a.label }))
  for (const schemaVersion of [1, 2, 3]) {
    const saved = JSON.stringify({ schemaVersion, actions: previous })
    const loaded = parseActions(saved)
    assert.deepEqual(JSON.parse(JSON.stringify(loaded)), previous)
    const missing = missingDefaultActions(loaded)
    assert.deepEqual(missing.map(a => a.id), ['add-logs'])
    assert.deepEqual(missingDefaultActions([...loaded, ...missing]), [])
  }
  const custom = { ...layout, commonActionIds: ['bug', 'compile'] }
  assert.deepEqual(parseLauncherLayout(JSON.stringify(custom), DEFAULT_ACTIONS, true), custom)
})
