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

/** One workflow record shaped like the Host wire value (no execution mode field). */
function workItem(over = {}) {
  const stages = Object.fromEntries(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']
    .map(stage => [stage, { status: 'pending', attempts: 0 }]))
  return {
    schemaVersion: 1, revision: 1, taskId: '11111111-1111-4111-8111-111111111111',
    sessionId: 'session-1', workspaceRoot: '/repo', title: 'Task', status: 'ready',
    currentStage: 'S1', branch: 'coding/abc12345', baseCommit: 'a'.repeat(40), commitRef: null,
    stages, repairRounds: 0, noProgressRounds: 0, checks: null, allowedPaths: null,
    review: null, verification: null, verificationRuns: [], approval: null, blocker: null,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...over,
  }
}

/** Mount the dock with only the inputs the launcher still declares. */
function harness() {
  const registration = loadBundle()
  const hooks = reactHooks()
  const mod = registration.factory(name => ({ react: hooks.react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {})
  let dock
  const ctx = {
    effect: fn => fn(), locale: { register() {}, bind: () => key => zh[key] ?? key },
    configForms: { get: () => ({}) }, sessions: {}, remote: {},
    slots: { inject: (_, fn) => fn(), register: (options, component) => {
      if (options.name === 'conversation.input.dock') dock = { options, component }
      return { dispose() {} }
    } },
  }
  mod.apply(ctx)
  const events = []
  const data = {
    draft: '修复登录失败', running: false, item: null, span: { start: 0, end: 0 },
    skills: DEFAULT_ACTIONS.filter(action => action.kind === 'skill').map(action => action.skillId),
  }
  const render = () => { hooks.reset(); return dock.component({
    ...dock.options.inject('session-1'),
    useActionForm: fn => fn({ status: 'ready', value: {}, writable: true }),
    useInput: fn => fn({ phase: 'plain', draft: data.draft }),
    useConversation: fn => fn({ views: new Map() }),
    useSession: fn => fn({ running: data.running }),
    useWorkflow: fn => fn({ item: data.item, loading: false, error: null }),
    useProjection: () => [],
    inputActions: {
      captureInsertion: () => data.span,
      insertText: text => { events.push(['insert', text]); return true },
      persistDraft: () => events.push(['persist']),
    },
    fetchSkillNames: async () => data.skills,
    workflowCommands: {
      approve: async () => { events.push(['approve']); return { ok: true } },
      pause: async () => { events.push(['pause']); return { ok: true } },
      resume: async () => { events.push(['resume']); return { ok: true } },
      cancel: async () => { events.push(['cancel']); return { ok: true } },
    },
    todoStaleMs: 90000, t: key => zh[key] ?? key,
  }) }
  const settle = () => new Promise(resolve => setImmediate(resolve))
  return { mod, dock, data, events, render, settle }
}

test('the launcher exposes no execution-mode or prepare-automatic controls', async () => {
  const h = harness()
  const tree = h.render()
  const rendered = nodes(tree)
  for (const label of ['手动', '全自动', '准备全自动任务']) {
    assert.equal(rendered.some(node => node.type === 'button' && node.props.children === label), false, label)
  }
  assert.equal(rendered.some(node => node.props?.['aria-label'] === '编码模式'), false)
  assert.ok(rendered.some(node => node.props?.['aria-label'] === '显示分组'), 'group visibility row remains')
  // Ordinary insertion still works; a mode switch can never be the only path.
  const action = rendered.find(node => node.type === 'button' && typeof node.props.title === 'string')
  assert.ok(action, 'at least one action button renders')
  action.props.onClick()
  await h.settle()
  assert.equal(h.events[0][0], 'insert')
  assert.deepEqual(h.events.map(event => event[0]), ['insert', 'persist'])
})

test('the published dock no longer injects Goal hooks or a mode command', () => {
  const h = harness()
  assert.equal(h.mod.inject.includes('remote.goals'), false)
  const injected = h.dock.options.inject('session-1')
  assert.equal('pauseWorkflow' in injected, false)
  assert.equal('resumeWorkflow' in injected, false)
  assert.equal('setMode' in injected.workflowCommands, false)
  assert.deepEqual(Object.keys(injected.workflowCommands).sort(), ['approve', 'cancel', 'pause', 'resume'])
  for (const key of ['workflowMode', 'manualMode', 'autoMode', 'autoPrepare', 'autoInstruction', 'autoHelp', 'workflowModeLabel'])
    assert.equal(key in zh, false, key)
})

test('the workflow panel renders the task without a mode field and keeps pause/resume', async () => {
  const h = harness()
  h.data.item = workItem()
  const tree = h.render()
  const panel = nodes(tree).find(node => typeof node.type === 'function' && node.type.name === 'WorkflowPanel')
  assert.ok(panel)
  assert.equal('continuationPaused' in panel.props, false)
  const panelNodes = nodes(panel.type(panel.props))
  assert.equal(JSON.stringify(panelNodes).includes('workflowModeLabel'), false)
  assert.equal(JSON.stringify(panelNodes).includes('编码模式'), false)
  const pause = panelNodes.find(node => node.type === 'button' && node.props.children === zh.workflowPause)
  assert.ok(pause, 'ready task can still be paused explicitly')
  assert.equal(pause.props.disabled, false)
  panel.props.onAction('pause')
  await h.settle()
  assert.deepEqual(h.events, [['pause']])
})
