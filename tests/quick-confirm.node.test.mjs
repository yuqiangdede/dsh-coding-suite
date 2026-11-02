import assert from 'node:assert/strict'
import { test } from 'node:test'

// Exercise the shipped browser bundle, not only its TypeScript source.
const registrations = []
globalThis.window = { __ModuleLoader__: { load: registration => registrations.push(registration) } }
await import(new URL('../lib/client.js', import.meta.url))
assert.equal(registrations.length, 1)

const jsx = (type, props, key) => ({ type, props: props ?? {}, key })
const react = {
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useRef: initial => ({ current: initial }),
  useMemo: compute => compute(),
  useEffect: () => {},
  useLayoutEffect: () => {},
}
const modules = { react, 'react/jsx-runtime': { jsx, jsxs: jsx } }
const client = registrations[0].factory(specifier => modules[specifier] ??= {})
const registrationsBySlot = []
const form = { status: 'ready', writable: true, revision: 1, value: {} }
client.apply({
  effect: effect => effect(),
  on: () => () => {},
  locale: { register: () => {}, bind: () => key => key },
  configForms: { get: () => form },
  sessions: {
    list: { getSnapshot: () => ({ byId: { session: { cwd: 'C:/project' } } }) },
    binding: () => ({ session: {
      getSnapshot: () => ({ openState: 'open' }),
      projections: { faceOf: () => ({ getSnapshot: () => null }) },
    } }),
  },
  remote: { skills: {}, workspaceFiles: {} },
  slots: {
    inject: (_, register) => register(),
    register: (options, component) => {
      registrationsBySlot.push({ options, component })
      return { dispose() {} }
    },
  },
})
const dock = registrationsBySlot.find(slot => slot.options.name === 'conversation.input.dock')
assert.ok(dock)
const injected = dock.options.inject('session')

const reply = { legacy: { nodes: [
  { data: { node: { kind: 'user', text: 'May I proceed?' } } },
  { data: { node: { kind: 'assistant', text: 'Please confirm the recommended option.' } } },
] } }

function renderConfirm(options = {}) {
  const calls = { inserted: [], submitted: 0 }
  const draft = options.draft ?? ''
  const attachments = options.attachments ?? []
  const props = {
    ...injected,
    useActionForm: select => select(form),
    useInput: select => select({ phase: 'plain', draft, attachmentIds: attachments }),
    useConversation: select => select({ views: new Map([['chat', options.chat ?? reply]]) }),
    useSession: select => select({ running: options.running ?? false }),
    useProjection: () => [],
    inputActions: {
      captureInsertion: () => options.span ?? { start: 0, end: 0, draftRev: 1 },
      insertText: (text, span) => {
        calls.inserted.push({ text, span })
        return true
      },
      persistDraft: () => {},
      submit: () => { calls.submitted += 1 },
    },
    t: key => key === 'confirmPrompt' ? 'Confirmed; proceed with the recommended default.' : key,
  }
  const nodes = []
  function walk(value) {
    if (Array.isArray(value)) { value.forEach(walk); return }
    if (!value || typeof value !== 'object' || !value.props) return
    nodes.push(value)
    walk(value.props.children)
  }
  walk(dock.component(props))
  const initializeAt = nodes.findIndex(node => node.props['data-setup-action'] === 'initialize')
  const confirmAt = nodes.findIndex(node => node.props['data-quick-confirm'] === 'previous-reply')
  assert.ok(initializeAt >= 0 && confirmAt === initializeAt + 1, 'Confirm follows Initialize')
  return { confirm: nodes[confirmAt], calls }
}

test('one click confirms and submits a completed reply before project initialization', () => {
  const { confirm, calls } = renderConfirm()
  assert.equal(confirm.props.disabled, false)
  confirm.props.onClick()
  assert.equal(calls.inserted.length, 1)
  assert.match(calls.inserted[0].text, /Confirmed/)
  assert.equal(calls.submitted, 1)
})

test('existing draft and attachments cannot be sent by quick confirm', () => {
  for (const options of [{ draft: 'unsent user text' }, { attachments: ['file1'] }]) {
    const { confirm, calls } = renderConfirm(options)
    assert.equal(confirm.props.disabled, true)
    assert.equal(calls.submitted, 0)
  }
})

test('quick confirm is not available while running or without a completed assistant reply', () => {
  const noReply = { legacy: { nodes: [{ data: { node: { kind: 'user', text: 'hello' } } }] } }
  for (const options of [{ running: true }, { chat: noReply }]) {
    const { confirm, calls } = renderConfirm(options)
    assert.equal(confirm.props.disabled, true)
    assert.equal(calls.submitted, 0)
  }
})

test('quick confirm refuses a changed selection rather than sending', () => {
  const { confirm, calls } = renderConfirm({ span: { start: 1, end: 1, draftRev: 1 } })
  assert.equal(confirm.props.disabled, false)
  confirm.props.onClick()
  assert.equal(calls.inserted.length, 0)
  assert.equal(calls.submitted, 0)
})
