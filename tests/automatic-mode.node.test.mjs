import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { zh } from '../src/client/locales.ts'

// Exercise the shipped public launcher, including asynchronous draft insertion.
function harness() {
  let registration, Launcher, cursor = 0
  const state = [], refs = []
  const jsx = (type, props) => ({ type, props })
  const react = {
    useEffect() {}, useMemo: fn => fn(),
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }] },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial } },
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: value => { registration = value } } },
  })
  const mod = registration.factory(name => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {})
  mod.apply({
    effect: fn => fn(), locale: { register() {}, bind: () => key => zh[key] ?? key },
    configForms: { get: () => ({}) }, sessions: {}, remote: {},
    slots: { inject: (_, fn) => fn(), register: (options, component) => {
      if (options.name === 'conversation.input.dock') Launcher = component
      return { dispose() {} }
    } },
  })
  const events = [], hostRefs = []
  const data = { draft: '修复登录失败', running: false, item: null, goal: null, skills: ['coding-workflow'], span: { start: 0, end: 0 }, pauseOk: true, modeOk: true }
  const render = () => { cursor = 0; return Launcher({
    useActionForm: fn => fn({ status: 'ready', value: {}, writable: true }),
    useInput: fn => fn({ phase: 'plain', draft: data.draft }),
    useConversation: fn => fn({ views: new Map() }),
    useSession: fn => fn({ running: data.running }),
    useWorkflow: fn => fn({ item: data.item, loading: false, error: null }),
    useProjection: name => name === 'goal' ? data.goal : [],
    inputActions: {
      captureInsertion: () => data.span,
      insertText: text => { events.push(['insert', text]); return true },
      persistDraft: () => events.push(['persist']),
    },
    fetchSkillNames: async () => data.skillPromise ? await data.skillPromise : data.skills,
    pauseWorkflow: async ref => { events.push(['pauseGoal', ref.id]); return data.pauseOk ? { ok: true } : { ok: false, error: { message: 'pause rejected' } } },
    resumeWorkflow: async ref => { events.push(['resumeGoal', ref.id]); if (data.resumeError) throw new Error('transport failed'); return { ok: true } },
    workflowCommands: {
      setMode: async mode => { events.push(['mode', mode]); return { ok: data.modeOk, message: 'mode rejected' } },
      pause: async () => { events.push(['pauseHost']); return { ok: true } },
      resume: async () => { events.push(['resumeHost']); return { ok: true } },
      cancel: async () => ({ ok: true }), approve: async () => ({ ok: true }),
    },
    todoStaleMs: 90000, t: key => zh[key] ?? key,
  }) }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...nodes(node.props?.children)]
  }
  const button = label => nodes(render()).find(n => n.type === 'button' && n.props.children === label)
  const click = async label => { const b = button(label); assert.ok(b, `button ${label}`); assert.equal(Boolean(b.props.disabled), false); b.props.onClick(); await new Promise(resolve => setImmediate(resolve)) }
  const panelAction = async action => {
    const panel = nodes(render()).find(n => typeof n.type === 'function' && n.type.name === 'WorkflowPanel')
    assert.ok(panel)
    panel.props.onAction(action)
    await new Promise(resolve => setImmediate(resolve))
  }
  return { data, events, render, nodes, button, click, panelAction }
}

test('manual by default; auto toggle shares group row and only prepares a preserved draft', async () => {
  const h = harness()
  assert.equal(h.button('手动').props['aria-pressed'], true)
  const row = h.nodes(h.render()).find(n => n.props?.['aria-label'] === '显示分组')
  assert.ok(h.nodes(row).some(n => n.type === 'button' && n.props.children === '全自动'))
  await h.click('全自动')
  assert.deepEqual(h.events, [])
  await h.click('准备全自动任务')
  assert.equal(h.events[0][0], 'insert')
  assert.ok(h.events[0][1].startsWith('/coding-workflow '))
  assert.match(h.events[0][1], /Bug|bug/)
  assert.equal(h.data.draft, '修复登录失败')
  assert.deepEqual(h.events.map(e => e[0]), ['insert', 'persist'])
})

test('missing skill and non-start selection cannot insert an automatic request', async () => {
  const h = harness()
  await h.click('全自动')
  h.data.skills = []
  await h.click('准备全自动任务')
  assert.deepEqual(h.events, [])
  h.data.skills = ['coding-workflow']; h.data.span = { start: 2, end: 2 }
  await h.click('准备全自动任务')
  assert.deepEqual(h.events, [])
})

test('manual takeover pauses only the matching goal before changing the Host mode', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'auto', status: 'ready' }
  h.data.goal = { goal: { id: 'goal-1', revision: 3, objective: '[coding-workflow:task-1] Fix login', phase: 'active' } }
  await h.click('手动')
  assert.deepEqual(h.events, [['pauseGoal', 'goal-1'], ['mode', 'manual']])
})

test('failed Goal pause leaves mode unchanged and does not mutate the Host', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'auto', status: 'ready' }
  h.data.goal = { goal: { id: 'goal-1', revision: 3, objective: '[coding-workflow:task-1] Fix login', phase: 'active' } }
  h.data.pauseOk = false
  await h.click('手动')
  assert.deepEqual(h.events, [['pauseGoal', 'goal-1']])
  assert.equal(h.button('全自动').props['aria-pressed'], true)
})

test('running unrelated goal cannot be paused or overwritten by mode switching', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'auto', status: 'ready' }
  h.data.goal = { goal: { id: 'other', revision: 1, objective: 'Other work', phase: 'active' } }
  h.data.running = true
  await h.click('手动')
  assert.deepEqual(h.events, [])
  assert.equal(h.button('全自动').props['aria-pressed'], true)
})

test('Host mode rejection does not change the displayed mode', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'manual', status: 'ready' }
  h.data.modeOk = false
  await h.click('全自动')
  assert.equal(h.button('手动').props['aria-pressed'], true)
})

test('switching an existing task to auto pauses it but never resumes the Goal', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'manual', status: 'ready' }
  await h.click('全自动')
  assert.deepEqual(h.events, [['mode', 'auto']])
})

test('panel pause stops the matching Goal before the Host', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'auto', status: 'ready' }
  h.data.goal = { goal: { id: 'goal-1', revision: 3, objective: '[coding-workflow:task-1]\nFix login', phase: 'active' } }
  await h.panelAction('pause')
  assert.deepEqual(h.events, [['pauseGoal', 'goal-1'], ['pauseHost']])
})

test('explicit automatic resume resumes the Host then its matching Goal', async () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'auto', status: 'paused' }
  h.data.goal = { goal: { id: 'goal-1', revision: 3, objective: '[coding-workflow:task-1] Fix login', phase: 'paused' } }
  await h.panelAction('resume')
  assert.deepEqual(h.events, [['resumeHost'], ['resumeGoal', 'goal-1']])
})

test('a linked standalone Goal supports safe manual takeover without Host Remote', async () => {
  const h = harness()
  h.data.goal = { goal: { id: 'goal-1', revision: 3, objective: '[coding-workflow:11111111-1111-4111-8111-111111111111] Fix login', phase: 'active' } }
  h.data.running = true
  assert.equal(h.button('全自动').props['aria-pressed'], true)
  await h.click('手动')
  assert.deepEqual(h.events, [['pauseGoal', 'goal-1']])
})

test('active automatic task disables single-stage mutations and duplicate preparation', () => {
  const h = harness()
  h.data.item = { taskId: 'task-1', mode: 'auto', status: 'ready' }
  assert.equal(h.button('编码').props.disabled, true)
  assert.equal(h.button('准备全自动任务').props.disabled, true)
})
