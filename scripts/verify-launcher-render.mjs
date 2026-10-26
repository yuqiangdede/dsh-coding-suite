/** Smoke-test the shipped DSH browser factory and the interactive group controls. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const jsx = (type, props, key) => ({ type, props: props ?? {}, key })
const reactJsx = { jsx, jsxs: jsx, Fragment: Symbol.for('react.fragment') }
const react = {
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useRef: initial => ({ current: initial }),
  useMemo: fn => fn(),
  useEffect: () => {},
  useCallback: fn => fn,
}
const registered = []
globalThis.window = { __ModuleLoader__: { load: entry => registered.push(entry) } }
await import(pathToFileURL(new URL('../lib/client.js', import.meta.url).pathname).href)
assert.equal(registered.length, 1)
const mod = registered[0].factory(name => {
  if (name === 'react') return react
  if (name === 'react/jsx-runtime') return reactJsx
  return {}
})
const mounts = []
const mutations = []
const form = {
  status: 'ready', writable: true, revision: 7,
  value: {},
  mutate: async (...args) => { mutations.push(args); return true },
}
const ctx = {
  effect: create => { create() },
  on: () => () => {},
  locale: { register: () => {}, bind: () => key => key },
  configForms: { get: () => form },
  sessions: { binding: () => ({ session: { getSnapshot: () => ({ openState: 'open' }), projections: { faceOf: () => ({ getSnapshot: () => null }) } } }) },
  remote: { $on: () => () => {}, skills: {}, goals: {} },
  slots: { inject: (_slot, register) => { register() }, register: (options, component) => { mounts.push({ options, component }); return { dispose() {} } } },
}
mod.apply(ctx)
const mount = mounts.find(x => x.options.name === 'conversation.input.dock')
assert(mount)
const injected = mount.options.inject('test-session')
const tree = mount.component({
  ...injected,
  t: key => key,
  useActionForm: selector => selector(form),
  useInput: selector => selector({ phase: 'plain', draft: '' }),
  useSession: selector => selector({ running: false }),
  useConversation: selector => selector({ views: new Map([['chat', { messages: [] }]]) }),
  useProjection: () => [],
  useWorkflow: selector => selector({ item: null }),
  inputActions: {
    captureInsertion: () => ({ start: 0, end: 0 }),
    insertText: () => true,
    persistDraft: () => {},
  },
})
const nodes = []
function visit(value) {
  if (Array.isArray(value)) return value.forEach(visit)
  if (!value || typeof value !== 'object') return
  if ('type' in value && 'props' in value) {
    nodes.push(value)
    visit(value.props.children)
  }
}
visit(tree)
const buttons = nodes.filter(x => x.type === 'button')
const toggles = buttons.filter(x => typeof x.props['aria-pressed'] === 'boolean')
assert.deepEqual(toggles.map(x => x.props.children), ['groupDevelopment', 'groupBugfix', 'groupDocuments', 'groupOthers'])
assert.deepEqual(toggles.map(x => x.props['aria-pressed']), [true, false, false, false])
assert.equal(buttons.filter(x => x.props.children === 'Bug排查').length, 1)
assert.equal(buttons.filter(x => x.props.children === '需求讨论').length, 2)
assert.equal(buttons.filter(x => x.props.children === '修复').length, 2)
assert.equal(buttons.filter(x => x.props.children === '继续').length, 1)
toggles[1].props.onClick()
await Promise.resolve()
assert.equal(mutations.length, 1)
const [operations, revision] = mutations[0]
assert.equal(revision, 7)
assert.deepEqual(operations[0].path, ['layoutJson'])
assert.equal(JSON.parse(operations[0].value).visibleGroups.bugfix, true)
console.log('OK grouped launcher: fixed common row, business groups, and persisted visibility toggle')
