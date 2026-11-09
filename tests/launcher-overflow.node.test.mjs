import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { zh, en } from '../src/client/locales.ts'
import { DEFAULT_ACTIONS, DIAGNOSTIC_MODES, REQUIREMENTS_HTML_PROMPT, encodeActions } from '../src/client/actions.ts'
import { conversationHistory } from '../src/client/contextual-actions.ts'

/** Project each entry onto the attribution fields, so unrelated shape additions stay out of these cases. */
const attributed = (view, actions) => conversationHistory(view, actions).map(({ id, command }) => ({ id, command }))

function harness({ actions, layout, english = false, measured = false, rowWidth = 0, widths = [], moreWidth = 0, dom, skillNames } = {}) {
  let registration, Launcher, cursor = 0
  const state = [], refs = [], events = [], layoutEffects = []
  const row = { clientWidth: rowWidth, getBoundingClientRect: () => ({ width: row.clientWidth }) }
  const jsx = (type, props) => ({ type, props })
  const react = {
    useEffect() {}, useMemo: fn => fn(),
    useLayoutEffect(fn) { layoutEffects.push(fn) },
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }] },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial } },
  }
  const sandbox = { window: { __ModuleLoader__: { load: value => { registration = value } } } }
  if (measured) {
    sandbox.window.getComputedStyle = () => ({ columnGap: '5px' })
    sandbox.document = { querySelector: () => ({}) }
    sandbox.ResizeObserver = class { observe() {} disconnect() {} }
  }
  if (dom) sandbox.document = dom
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
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
  const data = { config, messages: [], chat: undefined, writable: false, revision: 1, saveOk: true, running: false }
  const assignRefs = node => {
    if (!measured || !node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(assignRefs); return }
    if (typeof node.props?.ref === 'function') {
      if ('data-launcher-row' in node.props) node.props.ref(row)
      else if ('data-launcher-measure' in node.props) node.props.ref({
        querySelectorAll: () => widths.map(width => ({ getBoundingClientRect: () => ({ width }) })),
        querySelector: () => ({ getBoundingClientRect: () => ({ width: moreWidth }) }),
      })
    }
    assignRefs(node.props?.children)
  }
  const render = () => {
    cursor = 0
    layoutEffects.length = 0
    const tree = Launcher({
      useActionForm: fn => fn({ status: 'ready', value: data.config, writable: data.writable, revision: data.revision }),
      useInput: fn => fn({ phase: 'plain', draft: '', attachmentIds: [] }),
      useConversation: fn => fn({ views: new Map([['chat', data.chat ?? { messages: data.messages }]]) }),
      useSession: fn => fn({ running: data.running }),
      useProjection: () => [],
      inputActions: {
        captureInsertion: () => ({ start: 0, end: 0 }),
        insertText: text => { events.push(['insert', text]); return true },
        persistDraft: () => events.push(['persist']),
      },
      fetchSkillNames: async () => skillNames ?? [...DEFAULT_ACTIONS.filter(a => a.kind === 'skill').map(a => a.skillId), ...DIAGNOSTIC_MODES.map(mode => mode.skillId)],
      checkProjectSetup: async () => ({ ready: true, missing: [] }),
      saveLayout: async (json, revision) => { events.push(['save', json, revision]); if (data.saveWait) await data.saveWait; if (data.saveOk) data.config.layoutJson = json; return data.saveOk },
      todoStaleMs: 90000, t: key => dictionary[key] ?? key,
    })
    assignRefs(tree)
    return tree
  }
  const flush = () => { for (const effect of layoutEffects.splice(0)) effect() }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children)]
  }
  const group = id => nodes(render()).find(n => n.props?.['data-launcher-group'] === id)
  const buttons = id => nodes(group(id)).filter(n => n.type === 'button')
  const actionButtons = id => buttons(id).filter(n => typeof n.props.title === 'string' && n.props['aria-expanded'] === undefined)
  const overflow = id => buttons(id).find(n => typeof n.props['aria-expanded'] === 'boolean')
  return { render, flush, row, nodes, buttons, actionButtons, overflow, events, data }
}

const makeActions = count => Array.from({ length: count }, (_, i) => ({
  id: `custom-${i}`, label: `Action ${i}`, kind: 'prompt', prompt: `Prompt ${i}`,
  enabled: true, pinned: true, order: i, description: `Description ${i}`, example: '',
}))
const commonLayout = ids => ({ schemaVersion: 1, commonActionIds: ids, visibleGroups: { development: false, documents: false, others: false } })

test('group visibility responds before saving and rolls back on rejection', async () => {
  const h = harness()
  h.data.writable = true
  let finish
  h.data.saveWait = new Promise(resolve => { finish = resolve })
  h.data.saveOk = false
  const toggle = () => h.nodes(h.render()).find(n => n.type === 'button' && n.props.title === zh.groupDevelopmentHelp)
  assert.equal(toggle().props['aria-pressed'], true)
  toggle().props.onClick()
  assert.equal(toggle().props['aria-pressed'], false)
  finish()
  await h.data.saveWait
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(toggle().props['aria-pressed'], true)
})

test('conversation history follows sent user messages, remains visible while running, and expands', async () => {
  const h = harness()
  const action = id => DEFAULT_ACTIONS.find(a => a.id === id)
  const sent = id => ({ role: 'user', text: `/${action(id).skillId} ${action(id).prompt}` })
  h.data.messages = [sent('discussion'), { role: 'assistant', text: 'done' }, sent('spec'),
    { role: 'user', text: '再讨论一下' }, sent('execute'), sent('review'), sent('commit')]
  const history = () => h.nodes(h.render()).find(n => n.props?.['data-conversation-history'] === true)
  const labels = () => h.nodes(history()).filter(n => n.type === 'li').map(n => n.props.children.props.children)
  assert.deepEqual(labels(), ['提交代码', '代码审查', '编码', '自由对话', '固化需求'])
  assert.equal(h.nodes(history()).some(n => n.type === 'span' && n.props.children === zh.historyTitle), false)
  assert.equal(h.nodes(history()).find(n => n.type === 'ol').props['aria-label'], zh.historyTitle)
  h.data.running = true
  assert.equal(labels()[0], '提交代码')
  // Both controls and history are direct children of the same wrapping toolbar.
  const tree = h.render()
  const row = h.nodes(tree).find(n => Array.isArray(n.props?.children) && n.props.children.some(child => child?.props?.['aria-label'] === '显示分组') && n.props.children.some(child => child?.props?.['data-conversation-history']))
  assert.ok(row)
  const expand = h.nodes(history()).find(n => n.type === 'button' && 'aria-expanded' in n.props)
  assert.equal(expand.props.children, '查看全部（6）')
  expand.props.onClick()
  assert.deepEqual(labels(), ['提交代码', '代码审查', '编码', '自由对话', '固化需求', '需求讨论'])
  h.data.messages = [{ role: 'user', text: '/implement 手动输入' }, { role: 'user', text: '另一个会话' }]
  // A hand-typed command still names the one button that binds that skill.
  assert.deepEqual(labels(), ['自由对话', '编码'])
  h.data.messages = []
  assert.equal(history(), undefined)
})

test('history merges only adjacent identical labels before limiting and expanding', () => {
  const h = harness()
  const action = DEFAULT_ACTIONS.find(a => a.id === 'discussion')
  const discussion = () => ({ role: 'user', text: `/${action.skillId} ${action.prompt}` })
  h.data.messages = [discussion(), discussion(), { role: 'user', text: 'one' }, discussion(), discussion(), discussion(), discussion(), discussion(),
    { role: 'user', text: 'two' }, { role: 'user', text: 'three' }]
  const history = () => h.nodes(h.render()).find(n => n.props?.['data-conversation-history'] === true)
  const labels = () => h.nodes(history()).filter(n => n.type === 'li').map(n => n.props.children.props.children)
  assert.deepEqual(labels(), ['自由对话*2', '需求讨论*5', '自由对话', '需求讨论*2'])
  assert.equal(h.nodes(history()).find(n => n.type === 'button' && 'aria-expanded' in n.props), undefined)
  h.data.messages.push({ role: 'user', text: '/manual one' }, { role: 'user', text: '/manual two' }, { role: 'user', text: '/other three' })
  assert.deepEqual(labels(), ['/other', '/manual*2', '自由对话*2', '需求讨论*5', '自由对话'])
  const expand = h.nodes(history()).find(n => n.type === 'button' && 'aria-expanded' in n.props)
  assert.equal(expand.props.children, '查看全部（6）')
  expand.props.onClick()
  assert.deepEqual(labels(), ['/other', '/manual*2', '自由对话*2', '需求讨论*5', '自由对话', '需求讨论*2'])
  h.nodes(history()).find(n => n.type === 'button' && 'aria-expanded' in n.props).props.onClick()
  assert.equal(labels().length, 5)
})

test('unsent button insertions do not appear in conversation history', async () => {
  const h = harness()
  h.actionButtons('common').find(n => n.props.children === '需求讨论').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.nodes(h.render()).find(n => n.props?.['data-conversation-history'] === true), undefined)
})

test('history handles repeated actions, wrapped nodes, prompt buttons, and ambiguous signatures', () => {
  const action = { id: 'custom', kind: 'prompt', prompt: 'Unique inserted text' }
  const nodes = [
    { data: { node: { kind: 'user', content: [{ type: 'text', text: 'My request\n\nUnique inserted text' }] } } },
    { kind: 'tool-result', text: 'Unique inserted text' },
    { role: 'user', text: 'Unique inserted text' },
  ]
  assert.deepEqual(attributed({ legacy: { nodes } }, [action]), [{ id: 'custom', command: undefined }, { id: 'custom', command: undefined }])
  assert.deepEqual(attributed({ legacy: { nodes } }, [action, { ...action, id: 'other' }]), [{ id: null, command: undefined }, { id: null, command: undefined }])
})

test('history attributes a slash command to the only button binding its skill', () => {
  const skill = { id: 'handover', kind: 'skill', skillId: 'project-handover', prompt: 'Current prompt text' }
  const sent = text => ({ legacy: { nodes: [{ kind: 'user', text }] } })
  // A revised prompt or extra hand-typed context keeps the command, so the button stays identified.
  assert.deepEqual(attributed(sent('/project-handover Older prompt from a previous release'), [skill]), [{ id: 'handover', command: undefined }])
  assert.deepEqual(attributed(sent('/project-handover'), [skill]), [{ id: 'handover', command: undefined }])
  assert.deepEqual(attributed(sent('/Project-Handover extra wording'), [skill]), [{ id: 'handover', command: undefined }])
  // Unbound commands and prompt buttons never borrow a skill's button name.
  assert.deepEqual(attributed(sent('/other-command text'), [skill]), [{ id: null, command: 'other-command' }])
  assert.deepEqual(attributed(sent('/project-handover text'), [{ ...skill, kind: 'prompt' }]), [{ id: null, command: 'project-handover' }])
  // Exact content still decides between two buttons sharing one skill; without it, remain unguessed.
  const shared = [skill, { ...skill, id: 'second', prompt: 'Second prompt' }]
  assert.deepEqual(attributed(sent('/project-handover Current prompt text'), shared), [{ id: 'handover', command: undefined }])
  assert.deepEqual(attributed(sent('/project-handover Revised prompt text'), shared), [{ id: null, command: 'project-handover' }])
})

test('history entries keep the keyed user row used to locate the message', () => {
  const spec = DEFAULT_ACTIONS.find(action => action.id === 'spec')
  const text = '/' + spec.skillId + ' ' + spec.prompt
  const view = {
    order: ['chat:user:1', 'chat:assistant:1', 'chat:user:2'],
    nodes: {
      get: key => ({
        'chat:user:1': { kind: 'user', data: { content: [{ type: 'text', text: '先随便聊聊' }] } },
        'chat:assistant:1': { kind: 'assistant', data: { blocks: [{ kind: 'text', text: '好' }] } },
        'chat:user:2': { kind: 'user', data: { content: [{ type: 'text', text }] } },
      })[key],
    },
  }
  // Tool-only and assistant rows never appear; each user row keeps the key its DOM row mounts.
  assert.deepEqual(conversationHistory(view, [spec]), [
    { id: null, command: undefined, key: 'chat:user:1', text: '先随便聊聊' },
    { id: 'spec', command: undefined, key: 'chat:user:2', text },
  ])
})

test('history chips locate their mounted message and report an unloaded one', () => {
  const scrolled = []
  const rows = {}
  const row = key => ({
    parentElement: null,
    getAttribute: () => null,
    scrollIntoView: options => scrolled.push([key, options]),
    animate: () => ({ cancel() {} }),
  })
  const scrollport = { querySelector: selector => rows[/^\[data-chat-node-key="(.+)"\]$/.exec(selector)?.[1]] ?? null }
  const dom = { querySelectorAll: () => [scrollport], querySelector: () => scrollport }
  const h = harness({ dom })
  const spec = DEFAULT_ACTIONS.find(action => action.id === 'spec')
  h.data.chat = {
    order: ['chat:user:1', 'chat:user:2'],
    nodes: { get: key => ({
      'chat:user:1': { kind: 'user', data: { content: [{ type: 'text', text: '先随便聊聊' }] } },
      // Keyed rows carry the button-inserted prompt, so the chip is attributed and locatable.
      'chat:user:2': { kind: 'user', data: { content: [{ type: 'text', text: '/' + spec.skillId + ' ' + spec.prompt }] } },
    })[key] },
  }
  rows['chat:user:2'] = row('chat:user:2')
  const history = () => h.nodes(h.render()).find(n => n.props?.['data-conversation-history'] === true)
  const chips = () => h.nodes(history()).filter(n => n.type === 'button' && 'data-history-key' in n.props)
  assert.deepEqual(chips().map(entry => [entry.props.children, entry.props['data-history-key']]), [['固化需求', 'chat:user:2'], ['自由对话', 'chat:user:1']])
  assert.match(chips()[0].props.title, /定位到这条消息/)
  chips()[0].props.onClick()
  // Options are created inside the bundle's realm, so compare their primitive fields.
  assert.deepEqual(scrolled.map(([key, options]) => [key, options.block, options.behavior]), [['chat:user:2', 'center', 'smooth']])
  const notice = () => h.nodes(h.render()).find(n => n.props?.role === 'alert')
  assert.equal(notice(), undefined)
  // A row the Chat view no longer mounts cannot be located; the chip says so instead of guessing.
  rows['chat:user:2'] = undefined
  chips()[0].props.onClick()
  assert.match(notice().props.children, /没有找到这条消息/)
  assert.equal(scrolled.length, 1)
})

test('grouped history chips locate the newest message and keyless legacy chips do not scroll', () => {
  const scrolled = []
  const scrollport = { querySelector: () => ({ parentElement: null, getAttribute: () => null, scrollIntoView: options => scrolled.push(options), animate: () => ({}) }) }
  const dom = { querySelectorAll: () => [scrollport], querySelector: () => scrollport }
  const h = harness({ dom })
  h.data.chat = {
    order: ['chat:user:1', 'chat:user:2'],
    nodes: { get: key => ({
      'chat:user:1': { kind: 'user', data: { content: [{ type: 'text', text: '先随便聊聊' }] } },
      'chat:user:2': { kind: 'user', data: { content: [{ type: 'text', text: '再随便聊聊' }] } },
    })[key] },
  }
  const chips = () => h.nodes(h.render()).filter(n => n.type === 'button' && 'data-history-key' in n.props)
  assert.equal(chips()[0].props.children, '自由对话*2')
  assert.equal(chips()[0].props['data-history-key'], 'chat:user:2')
  chips()[0].props.onClick()
  assert.equal(scrolled.length, 1)
  // Compatibility rows expose no key, so their chip reports instead of scrolling elsewhere.
  const legacy = harness({ dom })
  legacy.data.messages = [{ role: 'user', text: '旧消息' }]
  const legacyChips = () => legacy.nodes(legacy.render()).filter(n => n.type === 'button' && 'data-history-key' in n.props)
  assert.equal(legacyChips()[0].props['data-history-key'], '')
  legacyChips()[0].props.onClick()
  assert.match(legacy.nodes(legacy.render()).find(n => n.props?.role === 'alert').props.children, /没有找到这条消息/)
})

test('development group is renamed in both the launcher and settings dictionary', () => {
  assert.equal(zh.groupDevelopment, '开发')
  assert.equal(en.groupDevelopment, 'Development')
  const h = harness()
  assert.ok(h.nodes(h.render()).some(n => n.type === 'button' && [n.props.children].flat().filter(value => typeof value === 'string').join('') === '开发'))
  assert.ok(!h.nodes(h.render()).some(n => n.props?.children === '需求开发'))
})

test('pipeline group renders eight then expands all configured stages and inserts correct drafts without sending', async () => {
  const h = harness()
  const expected = ['requirement-clarification', 'requirement-analysis', 'product-risk-gate', 'solution-design', 'product-module-gate', 'product-state-gate', 'product-exception-gate', 'prd-writing', 'requirement-review', 'product-prd-pages', 'product-consistency-gate', 'product-image-prompt']
  assert.equal(h.actionButtons('requirements-analysis').length, 8)
  assert.equal(h.overflow('requirements-analysis').props.children, '更多（4）')
  h.overflow('requirements-analysis').props.onClick()
  assert.deepEqual(h.actionButtons('requirements-analysis').map(n => n.props.children), expected.map(id => DEFAULT_ACTIONS.find(a => a.id === id).label))
  for (const [index, id] of expected.entries()) {
    h.actionButtons('requirements-analysis')[index].props.onClick()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.events.length, (index + 1) * 2)
    assert.equal(h.events.at(-1)[0], 'persist')
    assert.ok(h.events.at(-2)[1].startsWith('/' + DEFAULT_ACTIONS.find(a => a.id === id).skillId + ' '))
  }
  const old = harness({ layout: commonLayout(['bug']) })
  assert.equal(old.actionButtons('requirements-analysis').length, 0)
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
    assert.equal(h.events[0][0], 'insert')
    assert.equal(h.events[0][1], 'Prompt 8')
    assert.deepEqual(h.events.slice(1), [['persist']])
    h.overflow('common').props.onClick()
    assert.equal(h.actionButtons('common').length, 8)
  }
})

test('default groups expand independently, preserve action order and retain overflow recommendations', () => {
  const h = harness()
  assert.equal(h.actionButtons('common').length, 8)
  assert.equal(h.actionButtons('development').length, 8)
  assert.equal(h.overflow('development').props.children, '更多（8）')
  h.overflow('development').props.onClick()
  assert.equal(h.actionButtons('development').length, 16)
  assert.equal(h.actionButtons('common').length, 8)
  const developmentOrder = ['需求讨论', '固化需求', '编码', '代码审查', '修复', '编译', 'Bug排查', '提交代码', '补充排查', '分析日志', '咨询', '拆分工单', '架构优化', '测试驱动开发', '远程调试', '健康验收']
  assert.deepEqual(h.actionButtons('development').map(n => n.props.children), developmentOrder)
  h.overflow('development').props.onClick()
  h.data.messages = [{ role: 'user', text: '/to-spec 固化需求' }, { role: 'assistant', text: '规格已完成，验收标准已确认' }]
  assert.match(h.overflow('development').props.children, /•/, 'hidden recommended tickets remain discoverable')
  const english = harness({ english: true })
  assert.equal(english.overflow('development').props.children, 'More (8)')
  assert.match(english.overflow('development').props['aria-label'], /Development/)
})

test('rows fill the available width and only collapse the buttons that do not fit', () => {
  const widths = Array(16).fill(50)
  const layout = { schemaVersion: 1, commonActionIds: [], visibleGroups: { common: false, 'requirements-analysis': false, development: true, documents: false, others: false } }
  const h = harness({ measured: true, rowWidth: 600, widths, moreWidth: 70, layout })
  h.render(); h.flush(); h.render()
  assert.equal(h.actionButtons('development').length, 9)
  assert.equal(h.overflow('development').props.children, '更多（7）')
  h.row.clientWidth = 300
  h.render(); h.flush(); h.render()
  assert.equal(h.actionButtons('development').length, 4)
  assert.equal(h.overflow('development').props.children, '更多（12）')
  h.row.clientWidth = 1200
  h.render(); h.flush(); h.render()
  assert.equal(h.actionButtons('development').length, 16)
  assert.equal(h.overflow('development'), undefined, 'no More when the whole row fits')
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

test('common editor groups all enabled actions and synchronizes repeated members', async () => {
  const custom = makeActions(2).map((action, index) => ({ ...action, enabled: index === 0 }))
  const h = harness({ actions: [...DEFAULT_ACTIONS, ...custom], layout: commonLayout(['bug']) })
  h.data.writable = true
  const nodes = () => h.nodes(h.render())
  nodes().find(n => n.type === 'button' && n.props.children === '编辑常用').props.onClick()
  const group = id => nodes().find(n => n.props?.['data-common-editor-group'] === id)
  const labels = id => h.nodes(group(id)).filter(n => n.type === 'label').map(n => n.props.children[1])
  assert.deepEqual(['requirements-analysis', 'development', 'documents', 'others'].map(id => group(id).props['aria-label']), ['需求', '开发', '文档', '其他'])
  assert.ok(labels('requirements-analysis').includes('风险扫描'))
  assert.ok(labels('development').includes('健康验收'))
  assert.ok(labels('documents').includes('文档融合'))
  assert.ok(labels('development').includes('Bug排查'))
  assert.ok(!labels('others').includes('Bug排查'))
  for (const label of ['资料研究', '领域建模', '制作原型', '复盘', '上下文交接']) {
    assert.ok(labels('others').includes(label))
    assert.ok(!labels('development').includes(label))
  }
  assert.ok(labels('others').includes('Action 0'))
  assert.ok(!labels('others').includes('Action 1'))
  const repeated = () => nodes().filter(n => n.type === 'label' && n.props.children[1] === '文档融合')
    .map(label => h.nodes(label).find(n => n.type === 'input'))
  assert.equal(repeated().length, 1)
  repeated()[0].props.onChange({ target: { checked: true } })
  assert.ok(repeated().every(input => input.props.checked))
  repeated()[0].props.onChange({ target: { checked: false } })
  assert.ok(repeated().every(input => !input.props.checked))
  nodes().find(n => n.type === 'button' && n.props.children === '保存').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(JSON.parse(h.events[0][1]).commonActionIds, ['bug'])
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

for (const english of [false, true]) test('diagnostic chooser routes all four modes without sending, locale=' + english, async () => {
  for (const mode of DIAGNOSTIC_MODES) {
    const h = harness({ english })
    const trigger = h.actionButtons('common').find(n => n.props.children === (english ? 'Supplement Diagnostics' : '补充排查'))
    trigger.props.onClick()
    assert.equal(h.events.length, 0)
    const panel = h.nodes(h.render()).find(n => n.props?.['data-diagnostic-modes'] !== undefined)
    const choice = h.nodes(panel).find(n => n.type === 'button' && n.props.children === (english ? mode.english : mode.label))
    await choice.props.onClick()
    await new Promise(resolve => setImmediate(resolve))
    const insert = h.events.find(e => e[0] === 'insert')
    assert.ok(insert?.[1].startsWith('/' + mode.skillId + ' '), mode.skillId)
    assert.ok(insert[1].includes(mode.label))
    assert.deepEqual(h.events.map(e => e[0]), ['insert', 'persist'])
  }
})

test('diagnostic chooser cancels and unavailable skills never insert', async () => {
  const h = harness({ skillNames: [] })
  const trigger = () => h.actionButtons('common').find(n => n.props.children === '补充排查')
  trigger().props.onClick()
  let panel = h.nodes(h.render()).find(n => n.props?.['data-diagnostic-modes'] !== undefined)
  h.nodes(panel).find(n => n.type === 'button' && n.props.children === '取消').props.onClick()
  assert.equal(h.nodes(h.render()).some(n => n.props?.['data-diagnostic-modes'] !== undefined), false)
  assert.equal(h.events.length, 0)
  trigger().props.onClick()
  panel = h.nodes(h.render()).find(n => n.props?.['data-diagnostic-modes'] !== undefined)
  h.nodes(panel).find(n => n.type === 'button').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.events.length, 0)
  assert.ok(h.nodes(h.render()).some(n => n.props?.role === 'alert' && n.props.children.includes('diagnose-function-page')))
})

test('all diagnostic mode commands belong to the supplement button in sent history', () => {
  for (const mode of DIAGNOSTIC_MODES) {
    const view = { messages: [{ role: 'user', text: '/' + mode.skillId + ' 用户编辑过的排查说明' }] }
    assert.deepEqual(attributed(view, DEFAULT_ACTIONS), [{ id: 'add-logs', command: undefined }])
  }
})


for (const english of [false, true]) test('image output chooser inserts the selected editable draft, locale=' + english, async () => {
  for (const output of ['prompt', 'html']) {
    const h = harness({ english })
    h.overflow('requirements-analysis').props.onClick()
    h.actionButtons('requirements-analysis').find(node => node.props.children === (english ? 'Generate' : '生图')).props.onClick()
    assert.equal(h.events.length, 0)
    const panel = h.nodes(h.render()).find(node => node.props?.['data-image-output-modes'] !== undefined)
    assert(panel)
    const label = output === 'prompt' ? (english ? 'Prompt' : '提示词') : (english ? 'HTML page' : 'HTML页面')
    h.nodes(panel).find(node => node.type === 'button' && node.props.children === label).props.onClick()
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(h.events.map(event => event[0]), ['insert', 'persist'])
    if (output === 'prompt') assert(h.events[0][1].startsWith('/product-image-prompt '))
    else {
      assert(h.events[0][1].startsWith(REQUIREMENTS_HTML_PROMPT))
      assert.deepEqual(attributed({ messages: [{ role: 'user', text: h.events[0][1] }] }, DEFAULT_ACTIONS), [{ id: 'product-image-prompt', command: undefined }])
    }
  }
})

test('image output chooser cancellation does not insert a draft', () => {
  const h = harness()
  h.overflow('requirements-analysis').props.onClick()
  h.actionButtons('requirements-analysis').find(node => node.props.children === '生图').props.onClick()
  let panel = h.nodes(h.render()).find(node => node.props?.['data-image-output-modes'] !== undefined)
  h.nodes(panel).find(node => node.type === 'button' && node.props.children === '取消').props.onClick()
  panel = h.nodes(h.render()).find(node => node.props?.['data-image-output-modes'] !== undefined)
  assert.equal(panel, undefined)
  assert.deepEqual(h.events, [])
})
