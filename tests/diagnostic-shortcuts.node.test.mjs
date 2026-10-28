import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_ACTIONS, missingDefaultActions, parseActions, presentDefaultActions } from '../src/client/actions.ts'
import { actionsForGroup, defaultLauncherLayout, parseLauncherLayout } from '../src/client/launcher-layout.ts'
import { zh, en } from '../src/client/locales.ts'

test('diagnostic shortcuts provide editable inputs and respect existing configuration', () => {
  const analyze = DEFAULT_ACTIONS.find(a => a.id === 'analyze-logs')
  const remote = DEFAULT_ACTIONS.find(a => a.id === 'remote-debug')
  for (const action of [analyze, remote]) assert.equal(action.kind, 'prompt')
  assert.match(analyze.prompt, /日志路径：<请填写/)
  for (const field of ['SSH 连接信息：<请填写', '远程运行路径：<请填写', '问题描述：<请填写']) assert.ok(remote.prompt.includes(field))
  assert.match(remote.prompt, /缺少上述信息时先询问/)
  assert.deepEqual(presentDefaultActions([analyze, remote], true).map(a => a.label), ['Analyze Logs', 'Remote Debug'])
  const layout = defaultLauncherLayout(DEFAULT_ACTIONS)
  for (const group of ['common', 'development']) {
    const ids = actionsForGroup(group, DEFAULT_ACTIONS, layout).map(a => a.id)
    assert.equal(ids[ids.indexOf('add-logs') + 1], 'analyze-logs')
    assert.equal(ids.at(-1), 'remote-debug')
  }
  const old = DEFAULT_ACTIONS.filter(a => !['analyze-logs', 'remote-debug'].includes(a.id))
  const saved = JSON.stringify({ schemaVersion: 3, actions: old })
  assert.deepEqual(parseActions(saved), old)
  assert.deepEqual(missingDefaultActions(parseActions(saved)).map(a => a.id), ['analyze-logs', 'remote-debug'])
  const custom = { ...layout, commonActionIds: ['bug'] }
  assert.deepEqual(parseLauncherLayout(JSON.stringify(custom), DEFAULT_ACTIONS, true), custom)
  assert.equal(zh.groupDocuments, '文档')
  assert.equal(en.groupDocuments, 'Documentation')
})
