import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { DEFAULT_ACTIONS } from '../src/client/actions.ts'
import { zh } from '../src/client/locales.ts'

/** Load the published browser bundle exactly as the host loads it. */
function loadBundle() {
  let registration
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: value => { registration = value } } },
  })
  return registration
}

/** Minimal React surface the dock component needs. */
function reactHooks() {
  let cursor = 0
  const state = [], refs = []
  const react = {
    useEffect() {}, useLayoutEffect() {}, useMemo: fn => fn(),
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }] },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial } },
  }
  return { react, reset: () => { cursor = 0 } }
}

const jsx = (type, props) => ({ type, props })

function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...nodes(node.props?.children)]
}

/** Mount the dock with the inputs in the current launcher contract. */
function harness() {
  const registration = loadBundle()
  const hooks = reactHooks()
  const mod = registration.factory(name => ({ react: hooks.react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {})
  let dock
  const ctx = {
    effect: fn => fn(), locale: { register() {}, bind: () => key => zh[key] ?? key },
    configForms: { get: () => ({}) }, sessions: { list: { getSnapshot: () => ({ byId: {} }) }, binding: () => ({ session: { getSnapshot: () => null, projections: { faceOf: () => ({ getSnapshot: () => null }) } } }) }, remote: {},
    slots: { inject: (_, fn) => fn(), register: (options, component) => {
      if (options.name === 'conversation.input.dock') dock = { options, component }
      return { dispose() {} }
    } },
  }
  mod.apply(ctx)
  const events = []
  const data = {
    draft: '修复登录失败', running: false, span: { start: 0, end: 0 },
    skills: DEFAULT_ACTIONS.filter(action => action.kind === 'skill').map(action => action.skillId),
  }
  const render = () => { hooks.reset(); return dock.component({
    ...dock.options.inject('session-1'),
    useActionForm: fn => fn({ status: 'ready', value: {}, writable: true }),
    useInput: fn => fn({ phase: 'plain', draft: data.draft }),
    useConversation: fn => fn({ views: new Map() }),
    useSession: fn => fn({ running: data.running }),
    useProjection: () => [],
    inputActions: {
      captureInsertion: () => data.span,
      insertText: text => { events.push(['insert', text]); return true },
      persistDraft: () => events.push(['persist']),
    },
    fetchSkillNames: async () => data.skills,
    todoStaleMs: 90000, t: key => zh[key] ?? key,
  }) }
  const settle = () => new Promise(resolve => setImmediate(resolve))
  return { mod, dock, data, events, render, settle }
}

test('the launcher has no retired S0–S9 workflow or execution-mode controls', async () => {
  const h = harness()
  const tree = h.render()
  const rendered = nodes(tree)
  assert.equal(rendered.some(node => typeof node.type === 'function' && node.type.name === 'WorkflowPanel'), false)
  for (const label of ['手动', '全自动', '准备全自动任务']) {
    assert.equal(rendered.some(node => node.type === 'button' && node.props.children === label), false, label)
  }
  assert.equal(rendered.some(node => node.props?.['aria-label'] === '编码模式'), false)
  assert.ok(rendered.some(node => node.props?.['aria-label'] === '显示分组'), 'group visibility row remains')
  // Ordinary insertion still works; a mode switch can never be the only path.
  const action = rendered.find(node => node.type === 'button' && node.props.children === '分析日志')
  assert.ok(action, 'at least one action button renders')
  action.props.onClick()
  await h.settle()
  assert.equal(h.events[0][0], 'insert')
  assert.deepEqual(h.events.map(event => event[0]), ['insert', 'persist'])
})

test('the published dock contract contains no retired workflow hooks or commands', () => {
  const h = harness()
  assert.equal(Array.from(h.mod.inject).includes('remote.goals'), false)
  assert.equal(Array.from(h.mod.inject).includes('remote.skills'), true)
  const injected = h.dock.options.inject('session-1')
  for (const key of ['pauseWorkflow', 'resumeWorkflow', 'workflowCommands', 'useWorkflow', 'workflowTaskId'])
    assert.equal(Object.hasOwn(injected, key), false, key)
  for (const key of ['workflowMode', 'manualMode', 'autoMode', 'autoPrepare', 'autoInstruction', 'autoHelp', 'workflowModeLabel'])
    assert.equal(Object.hasOwn(zh, key), false, key)
})
