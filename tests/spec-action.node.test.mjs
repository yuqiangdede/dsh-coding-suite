import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { zh } from '../src/client/locales.ts'

const user = text => ({ role: 'user', text })
const reply = (text, interrupted = false) => ({ role: 'assistant', text, interrupted })

function loadLauncher() {
  let registration
  const jsx = (type, props) => ({ type, props })
  const hooks = {
    useEffect() {},
    useId: () => 'test',
    useMemo: fn => fn(),
    useRef: value => ({ current: value }),
    useState: value => [value, () => {}],
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: value => { registration = value } } },
  })
  const stubs = { react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx } }
  const module = registration.factory(name => stubs[name] ?? {})
  let Launcher
  module.apply({
    effect: fn => fn(), on: () => () => {},
    locale: { register() {}, bind: () => key => zh[key] ?? key },
    configForms: { get: () => ({ status: 'ready', value: {}, subscribe: () => () => {} }) },
    sessions: {}, remote: { $on: () => () => {}, skills: {} },
    slots: {
      inject: (_, fn) => fn(),
      register: (options, component) => {
        if (options.name === 'conversation.input.dock') Launcher = component
        return { dispose() {} }
      },
    },
  })
  return Launcher
}

const buttons = node => {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(buttons)
  return [...(node.type === 'button' ? [node] : []), ...buttons(node.props?.children)]
}

const settle = () => new Promise(resolve => setImmediate(resolve))

test('every launcher action stays clickable without a prior discussion conclusion', async () => {
  const Launcher = loadLauncher()
  let insertions = 0
  const render = ({ messages = [], running = false, phase = 'plain' } = {}) => Launcher({
    useActionForm: fn => fn({ status: 'ready', value: {} }),
    useInput: fn => fn({ phase, draft: '' }),
    useConversation: fn => fn({ views: new Map([['chat', { messages }]]) }),
    useSession: fn => fn({ running }),
    useWorkflow: fn => fn({ item: null }), useProjection: () => [],
    inputActions: {
      captureInsertion: () => ({ start: 0, end: 0 }),
      insertText: () => { insertions++; return true },
      persistDraft() {},
    },
    fetchSkillNames: async () => ['to-spec'], todoStaleMs: 90000,
    t: key => zh[key] ?? key,
  })
  const actionButtons = messages => buttons(render({ messages })).filter(node => typeof node.props.title === 'string')
  const spec = messages => actionButtons(messages).find(node => node.props.children === '固化需求')
  const click = async button => {
    const before = insertions
    button.props.onClick()
    await settle()
    return insertions - before
  }

  const empty = actionButtons([])
  assert.equal(empty.length > 0, true)
  assert.deepEqual(empty.filter(button => button.props.disabled), [])
  const specButton = spec([])
  assert.ok(specButton)
  assert.equal(specButton.props.disabled, false)
  assert.equal(specButton.props.title.includes('请先完成需求讨论'), false)
  assert.equal(await click(specButton), 1)

  for (const messages of [
    [user('/grill-with-docs'), reply('请先确认范围')],
    [user('/grill-with-docs'), reply('需求已确认', true)],
    [user('/grill-with-docs'), { kind: 'turn-error', message: 'failed' }],
  ]) {
    const button = spec(messages)
    assert.equal(button.props.disabled, false)
    assert.equal(await click(button), 1)
  }

  const runningSpec = buttons(render({ running: true })).find(node => node.props.children === '固化需求')
  assert.ok(runningSpec)
  assert.equal(runningSpec.props.disabled, false)
  assert.equal(await click(runningSpec), 1)
  assert.equal(spec([user('/grill-with-docs'), reply('讨论结论：需求已确认')]).props.disabled, false)
})

test('generic unavailability still disables actions', async () => {
  const Launcher = loadLauncher()
  let insertions = 0
  const render = phase => Launcher({
    useActionForm: fn => fn({ status: 'ready', value: {} }),
    useInput: fn => fn({ phase, draft: '' }),
    useConversation: fn => fn({ views: new Map([['chat', { messages: [] }]]) }),
    useSession: fn => fn({ running: false }),
    useWorkflow: fn => fn({ item: null }), useProjection: () => [],
    inputActions: {
      captureInsertion: () => ({ start: 0, end: 0 }),
      insertText: () => { insertions++; return true },
      persistDraft() {},
    },
    fetchSkillNames: async () => ['to-spec'], todoStaleMs: 90000,
    t: key => zh[key] ?? key,
  })
  const spec = buttons(render('busy')).find(node => node.props.children === '固化需求')
  assert.ok(spec)
  assert.equal(spec.props.disabled, true)
  spec.props.onClick()
  await settle()
  assert.equal(insertions, 0)
})
