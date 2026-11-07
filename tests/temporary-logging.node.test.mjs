import { test } from 'node:test'
import assert from 'node:assert/strict'
import { actionsForGroup, defaultLauncherLayout, parseLauncherLayout } from '../src/client/launcher-layout.ts'
import { DEFAULT_ACTIONS, presentDefaultActions, parseActions, encodeActions, missingDefaultActions } from '../src/client/actions.ts'

test('supplement diagnostics replaces logging with a scoped skill shortcut', () => {
  const action = DEFAULT_ACTIONS.find(a => a.id === 'add-logs')
  assert.ok(action)
  assert.equal(action.label, '补充排查')
  assert.equal(action.kind, 'skill')
  assert.equal(action.skillId, 'diagnose-function-page')
  assert.equal(action.enabled, true)
  assert.equal(action.pinned, true)
  assert.ok(action.order > DEFAULT_ACTIONS.find(a => a.id === 'bug').order)
  assert.ok(action.order < DEFAULT_ACTIONS.find(a => a.id === 'review').order)
  for (const boundary of ['本对话', '完成编码', '范围', '先说明并询问', '不改变业务执行逻辑', '未验证']) {
    assert.ok(action.prompt.includes(boundary), boundary)
  }
  assert.equal(presentDefaultActions([{ ...action }], true)[0].label, 'Supplement Diagnostics')
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

const oldPrompt = `请针对当前要复现排查的具体问题，增加最少量的临时诊断日志。
先从本会话确认问题现象、预期与实际行为、触发条件/复现步骤、运行环境和需要验证的假设；信息不足时先询问，不猜测问题，不泛化为全项目日志改造。
读取相关调用链和现有日志机制，说明每个日志点要验证什么，再仅在必要入口、关键分支、状态变化、异常出口或异步边界加日志；不修复业务逻辑、不做无关重构，不改变返回值、异常传播、时序或业务副作用。
复用现有 logger、级别及关联 ID，记录足以区分假设的事件、必要状态和耗时；敏感字段必须脱敏，不记录口令、令牌、Cookie、完整请求/响应或用户隐私。避免循环刷屏、大对象序列化和额外 I/O，必要时限频或采样。
所有新增日志用统一且针对本问题的 TEMP-DIAG 标识标记（注明临时用途及移除条件），优先复用已有调试开关且默认关闭；没有适用开关时采用最小局部控制并说明启停方法，不全局开启 debug，不擅自操作生产环境。日志参数求值也应受开关保护，避免关闭后仍产生开销或副作用。
完成后输出：日志点及对应假设、复现步骤、如何临时开启/关闭和采集哪些脱敏日志、已执行的针对性验证及未验证项；未实际复现时不得声称已定位根因。不执行完整编译，不提交或推送。
维护可搜索的清理清单：列出标识、文件位置、本次新增的日志/临时开关/配置及其移除方式，保留原有日志和用户其他改动。明确说明关闭开关不等于移除临时代码。
完成本次加日志后，必须提醒用户：“这些是临时诊断日志，复现取证或问题排查结束后请移除，并恢复临时配置。”在本会话后续获得复现结果、定位/修复问题或结束排查时再次提醒用户，清理前确认范围，清理后做针对性验证。未确认清理前明确标为待清理，不声称已经移除；不承诺跨会话或后台自动提醒，交接时携带清理清单。`

test('saved old presets upgrade in all schemas but custom prompts and empty lists survive', () => {
  const current = DEFAULT_ACTIONS.find(a => a.id === 'add-logs')
  const old = { ...current, kind: 'prompt', label: '增加日志', prompt: oldPrompt, enabled: false, pinned: false }
  delete old.skillId
  for (const schemaVersion of [1, 2, 3]) {
    const upgraded = parseActions(JSON.stringify({ schemaVersion, actions: [old] }))[0]
    assert.equal(upgraded.label, '补充排查')
    assert.equal(upgraded.skillId, 'diagnose-function-page')
    assert.equal(upgraded.enabled, false)
    assert.equal(upgraded.pinned, false)
    const custom = { ...old, prompt: oldPrompt + '\n保留我的定制说明' }
    assert.deepEqual(parseActions(JSON.stringify({ schemaVersion, actions: [custom] }))[0], custom)
    assert.deepEqual(parseActions(JSON.stringify({ schemaVersion, actions: [] })), [])
  }
})
