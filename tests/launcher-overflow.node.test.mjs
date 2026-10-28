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
  const data = { config, messages: [] }
  const render = () => { cursor = 0; return Launcher({
    useActionForm: fn => fn({ status: 'ready', value: data.config, writable: false }),
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
    saveLayout: async () => { events.push(['save']); return true },
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
  assert.equal(h.overflow('development').props.children, '更多（4）')
  h.overflow('development').props.onClick()
  assert.equal(h.actionButtons('development').length, 12)
  assert.equal(h.actionButtons('common').length, 8)
  const developmentOrder = ['需求讨论', '可视化讨论', '固化需求', '拆分工单', '编码', '增加日志', '代码审查', '修复', '编译', '健康验收', '提交代码', '补充文档']
  assert.deepEqual(h.actionButtons('development').map(n => n.props.children), developmentOrder)
  h.overflow('development').props.onClick()
  h.data.messages = [{ role: 'user', text: '/implement' }, { role: 'assistant', text: '实现完成，测试通过' }]
  assert.match(h.overflow('development').props.children, /•/, 'hidden recommended Build remains discoverable')
  const english = harness({ english: true })
  assert.equal(english.overflow('development').props.children, 'More (4)')
  assert.match(english.overflow('development').props['aria-label'], /Development/)
})

test('disabled actions do not count toward overflow and saved common ordering is preserved', () => {
  const actions = makeActions(9).map((a, i) => ({ ...a, enabled: i !== 8 }))
  const h = harness({ actions, layout: commonLayout(actions.map(a => a.id).reverse()) })
  assert.equal(h.overflow('common'), undefined)
  assert.deepEqual(h.actionButtons('common').map(n => n.props.children), actions.filter(a => a.enabled).reverse().map(a => a.label))
})
