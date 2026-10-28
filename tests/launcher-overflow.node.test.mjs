import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { zh, en } from '../src/client/locales.ts'
import { encodeActions } from '../src/client/actions.ts'

function harness({ actions, layout, english = false } = {}) {
  let registration, Launcher, cursor = 0
  const state = [], refs = [], events = []
  const jsx = (type, props) => ({ type, props })
  const react = {
    useEffect() {}, useMemo: fn => fn(),
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }] },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial } },
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: value => { registration = value } } },
  })
  const dictionary = english ? en : zh
  registration.factory(name => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {}).apply({
    effect: fn => fn(), locale: { register() {}, bind: () => key => dictionary[key] ?? key },
    configForms: { get: () => ({}) }, sessions: {}, remote: {},
    slots: { inject: (_, fn) => fn(), register: (options, component) => {
      if (options.name === 'conversation.input.dock') Launcher = component
      return { dispose() {} }
    } },
  })
  const config = { ...(actions ? { actionsJson: encodeActions(actions) } : {}), ...(layout ? { layoutJson: JSON.stringify(layout) } : {}) }
  const data = { config, messages: [], writable: false, revision: 1, saveOk: true }
  const render = () => { cursor = 0; return Launcher({
    useActionForm: fn => fn({ status: 'ready', value: data.config, writable: data.writable, revision: data.revision }),
    useInput: fn => fn({ phase: 'plain', draft: '' }),
    useConversation: fn => fn({ views: new Map([['chat', { messages: data.messages }]]) }),
    useSession: fn => fn({ running: false }),
    useWorkflow: fn => fn({ item: null }), useProjection: () => [],
    inputActions: {
      captureInsertion: () => ({ start: 0, end: 0 }),
      insertText: text => { events.push(['insert', text]); return true },
      persistDraft: () => events.push(['persist']),
    },
    fetchSkillNames: async () => ['to-spec'],
    saveLayout: async (json, revision) => { events.push(['save', json, revision]); if (data.saveOk) data.config.layoutJson = json; return data.saveOk },
    todoStaleMs: 90000, t: key => dictionary[key] ?? key,
  }) }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children)]
  }
  const group = id => nodes(render()).find(n => n.props?.['data-launcher-group'] === id)
  const buttons = id => nodes(group(id)).filter(n => n.type === 'button')
  const actionButtons = id => buttons(id).filter(n => typeof n.props.title === 'string' && n.props['aria-expanded'] === undefined)
  const overflow = id => buttons(id).find(n => typeof n.props['aria-expanded'] === 'boolean')
  return { render, nodes, buttons, actionButtons, overflow, events, data }
}

const makeActions = count => Array.from({ length: count }, (_, i) => ({
  id: `custom-${i}`, label: `Action ${i}`, kind: 'prompt', prompt: `Prompt ${i}`,
  enabled: true, pinned: true, order: i, description: `Description ${i}`, example: '',
}))
const commonLayout = ids => ({ schemaVersion: 1, commonActionIds: ids, visibleGroups: { development: false, documents: false, others: false } })

test('development group is renamed in both the launcher and settings dictionary', () => {
  assert.equal(zh.groupDevelopment, '开发')
  assert.equal(en.groupDevelopment, 'Development')
  const h = harness()
  assert.ok(h.nodes(h.render()).some(n => n.type === 'button' && [n.props.children].flat().filter(value => typeof value === 'string').join('') === '开发'))
  assert.ok(!h.nodes(h.render()).some(n => n.props?.children === '需求开发'))
})

test('groups show eight actions; the ninth is expanded and collapsed without changing settings or draft', async () => {
  for (const count of [0, 1, 8, 9]) {
    const actions = makeActions(count)
    const h = harness({ actions, layout: commonLayout(actions.map(a => a.id)) })
    assert.equal(h.actionButtons('common').length, Math.min(count, 8))
    if (count <= 8) { assert.equal(h.overflow('common'), undefined); continue }
    const more = h.overflow('common')
    assert.equal(more.props.children, '更多（1）')
    assert.equal(more.props['aria-expanded'], false)
    assert.match(more.props['aria-label'], /常用/)
    assert.equal(Boolean(more.props.disabled), false, 'expansion works with read-only settings')
    more.props.onClick()
    assert.deepEqual(h.actionButtons('common').map(n => n.props.children), actions.map(a => a.label))
    assert.equal(h.overflow('common').props['aria-expanded'], true)
    assert.equal(h.overflow('common').props.children, '收起')
    assert.deepEqual(h.events, [])
    h.actionButtons('common')[8].props.onClick()
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(h.events, [['insert', 'Prompt 8'], ['persist']])
    h.overflow('common').props.onClick()
    assert.equal(h.actionButtons('common').length, 8)
  }
})

test('default groups expand independently, preserve action order and retain overflow recommendations', () => {
  const h = harness()
  assert.equal(h.actionButtons('common').length, 8)
  assert.equal(h.actionButtons('development').length, 8)
  assert.equal(h.overflow('development').props.children, '更多（6）')
  h.overflow('development').props.onClick()
  assert.equal(h.actionButtons('development').length, 14)
  assert.equal(h.actionButtons('common').length, 8)
  const developmentOrder = ['需求讨论', '可视化讨论', '固化需求', '拆分工单', '编码', '增加日志', '分析日志', '代码审查', '修复', '编译', '健康验收', '提交代码', '补充文档', '远程调试']
  assert.deepEqual(h.actionButtons('development').map(n => n.props.children), developmentOrder)
  h.overflow('development').props.onClick()
  h.data.messages = [{ role: 'user', text: '/implement' }, { role: 'assistant', text: '实现完成，测试通过' }]
  assert.match(h.overflow('development').props.children, /•/, 'hidden recommended Build remains discoverable')
  const english = harness({ english: true })
  assert.equal(english.overflow('development').props.children, 'More (6)')
  assert.match(english.overflow('development').props['aria-label'], /Development/)
})

test('disabled actions do not count toward overflow and saved common ordering is preserved', () => {
  const actions = makeActions(9).map((a, i) => ({ ...a, enabled: i !== 8 }))
  const h = harness({ actions, layout: commonLayout(actions.map(a => a.id).reverse()) })
  assert.equal(h.overflow('common'), undefined)
  assert.deepEqual(h.actionButtons('common').map(n => n.props.children), actions.filter(a => a.enabled).reverse().map(a => a.label))
})

test('diagnostic buttons insert editable prompts into the draft', async () => {
  const h = harness()
  h.actionButtons('common').find(n => n.props.children === '分析日志').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.match(h.events[0][1], /日志路径：<请填写/)
  h.overflow('common').props.onClick()
  h.actionButtons('common').find(n => n.props.children === '远程调试').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.match(h.events[2][1], /SSH 连接信息：<请填写/)
  assert.match(h.events[2][1], /远程运行路径：<请填写/)
  assert.match(h.events[2][1], /问题描述：<请填写/)
})

test('common visibility saves, restores, and respects read-only or rejected changes', async () => {
  const h = harness()
  const toggle = () => h.nodes(h.render()).find(n => n.type === 'button' && [n.props.children].flat().includes('常用') && typeof n.props['aria-pressed'] === 'boolean')
  assert.equal(toggle().props['aria-pressed'], true)
  assert.equal(toggle().props.disabled, true)
  h.data.writable = true
  toggle().props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(JSON.parse(h.events[0][1]).visibleGroups.common, false)
  assert.equal(h.events[0][2], 1)
  assert.equal(toggle().props['aria-pressed'], false)
  assert.equal(h.nodes(h.render()).some(n => n.props?.['data-launcher-group'] === 'common'), false)
  h.data.saveOk = false
  toggle().props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(toggle().props['aria-pressed'], false)
  h.data.saveOk = true
  toggle().props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(toggle().props['aria-pressed'], true)
  assert.ok(h.nodes(h.render()).some(n => n.props?.['data-launcher-group'] === 'common'))
})

test('edit common on the launcher: select, cancel, save and preserve unavailable IDs', async () => {
  const actions = makeActions(4).map((a, i) => ({ ...a, enabled: i !== 3 }))
  const layout = { ...commonLayout(['custom-0', 'custom-3', 'missing-action']), visibleGroups: { common: false, development: false, documents: false, others: false } }
  const h = harness({ actions, layout }); h.data.writable = true
  const nodes = () => h.nodes(h.render())
  const button = text => nodes().find(n => n.type === 'button' && n.props.children === text)
  const checkbox = text => { const label = nodes().find(n => n.type === 'label' && [n.props.children].flat().includes(text)); return h.nodes(label).find(n => n.type === 'input') }
  button('编辑常用').props.onClick()
  assert.equal(checkbox('Action 0').props.checked, true)
  assert.equal(checkbox('Action 1').props.checked, false)
  assert.equal(checkbox('Action 3'), undefined)
  assert.equal(nodes().some(n => n.props?.['data-launcher-group']), false)
  checkbox('Action 0').props.onChange({ target: { checked: false } })
  checkbox('Action 1').props.onChange({ target: { checked: true } })
  button('取消').props.onClick()
  assert.deepEqual(h.events, [])
  button('编辑常用').props.onClick()
  assert.equal(checkbox('Action 0').props.checked, true)
  checkbox('Action 0').props.onChange({ target: { checked: false } })
  checkbox('Action 1').props.onChange({ target: { checked: true } })
  button('保存').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(JSON.parse(h.events[0][1]).commonActionIds, ['custom-3', 'missing-action', 'custom-1'])
  assert.equal(JSON.parse(h.events[0][1]).visibleGroups.common, false)
  assert.equal(button('保存'), undefined)
  assert.equal(h.events.some(e => e[0] === 'insert'), false)
})

test('edit common keeps changes on save rejection and blocks stale revisions', async () => {
  const h = harness({ actions: makeActions(2), layout: commonLayout(['custom-0']) }); h.data.writable = true
  const nodes = () => h.nodes(h.render())
  const button = text => nodes().find(n => n.type === 'button' && n.props.children === text)
  button('编辑常用').props.onClick()
  const label = nodes().find(n => n.type === 'label' && [n.props.children].flat().includes('Action 1'))
  h.nodes(label).find(n => n.type === 'input').props.onChange({ target: { checked: true } })
  h.data.saveOk = false
  button('保存').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(button('保存'))
  assert.equal(h.nodes(nodes().find(n => n.type === 'label' && [n.props.children].flat().includes('Action 1'))).find(n => n.type === 'input').props.checked, true)
  h.data.revision++
  button('保存').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.events.length, 1)
  assert.ok(nodes().some(n => n.props?.role === 'alert' && n.props.children.includes('配置被其他窗口更新')))
})
