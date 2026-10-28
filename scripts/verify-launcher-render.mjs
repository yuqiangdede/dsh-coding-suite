/** Smoke-test the shipped DSH browser factory and the interactive group controls. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const jsx = (type, props, key) => ({ type, props: props ?? {}, key })
const reactJsx = { jsx, jsxs: jsx, Fragment: Symbol.for('react.fragment') }
let cursor = 0
const state = []
const react = {
  useState: initial => {
    const index = cursor++
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
    return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value }]
  },
  useRef: initial => ({ current: initial }),
  useMemo: fn => fn(),
  useEffect: () => {},
  useCallback: fn => fn,
}
const registered = []
globalThis.window = { __ModuleLoader__: { load: entry => registered.push(entry) } }
await import(new URL('../lib/client.js', import.meta.url).href)
assert.equal(registered.length, 1)
const mod = registered[0].factory(name => {
  if (name === 'react') return react
  if (name === 'react/jsx-runtime') return reactJsx
  return {}
})
const mounts = []
const mutations = []
let inserted = ''
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
const render = () => { cursor = 0; return mount.component({
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
    insertText: (text) => { inserted = text; return true },
    persistDraft: () => {},
  },
}) }
const tree = render()
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
const toggles = buttons.filter(x => typeof x.props['aria-pressed'] === 'boolean'
  && ['groupCommon', 'groupRequirementsAnalysis', 'groupDevelopment', 'groupDocuments', 'groupOthers'].includes([x.props.children].flat().filter(value => typeof value === 'string').join('')))
const manual = buttons.find(x => x.props.children === 'manualMode')
const automatic = buttons.find(x => x.props.children === 'autoMode')
assert.equal(manual?.props['aria-pressed'], true, 'launcher must default to manual')
assert.equal(automatic?.props['aria-pressed'], false)
assert.deepEqual(toggles.map(x => [x.props.children].flat().filter(value => typeof value === 'string').join('')), ['groupCommon', 'groupRequirementsAnalysis', 'groupDevelopment', 'groupDocuments', 'groupOthers'])
assert.deepEqual(toggles.map(x => x.props['aria-pressed']), [true, true, true, false, false])
assert.equal(buttons.filter(x => x.props.children === '编码').length, 2)
assert.equal(buttons.filter(x => x.props.children === '开发').length, 0)
assert.equal(buttons.filter(x => x.props.children === 'Bug排查').length, 1)
assert.equal(buttons.filter(x => x.props.children === '需求讨论').length, 2)
assert.equal(buttons.filter(x => x.props.children === '修复').length, 1, 'development action starts collapsed')
assert.equal(buttons.filter(x => x.props.children === '继续').length, 0, 'ninth Common action starts collapsed')
const overflow = buttons.filter(x => x.props['aria-expanded'] === false)
assert.equal(overflow.length, 3, 'Common, Requirements Analysis and Development offer independent More controls')
for (const button of overflow) button.props.onClick()
nodes.length = 0
visit(render())
assert.equal(nodes.filter(x => x.type === 'button' && x.props.children === '继续').length, 1)
const supplement = nodes.find(x => x.type === 'button' && x.props.children === '补充文档')
assert(supplement, 'Supplement Docs button missing')
supplement.props.onClick()
assert(inserted.includes('来源：本会话'), 'supplement draft must default to this session')
assert(inserted.includes('时间段'), 'supplement draft must offer a time range')
assert(inserted.includes('版本'), 'supplement draft must offer a version baseline')
assert(inserted.includes('接收补充来源'), 'supplement draft must include receiving instructions')
toggles[3].props.onClick()
await Promise.resolve()
assert.equal(mutations.length, 1)
const [operations, revision] = mutations[0]
assert.equal(revision, 7)
assert.deepEqual(operations[0].path, ['layoutJson'])
assert.equal(JSON.parse(operations[0].value).visibleGroups.documents, true)
console.log('OK grouped launcher: fixed common row, business groups, persisted visibility toggle, and supplement draft sources')
