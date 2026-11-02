import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('stable layout measurements do not schedule repeated synchronous updates', () => {
  let registration, launcher, cursor = 0, updates = 0, effect
  const state = [], refs = []
  const react = {
    useEffect() {}, useMemo: fn => fn(), useLayoutEffect: fn => { effect = fn },
    useState(initial) {
      const i = cursor++
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial
      return [state[i], value => { updates++; state[i] = typeof value === 'function' ? value(state[i]) : value }]
    },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial } },
  }
  const jsx = (type, props) => ({ type, props })
  const sandbox = {
    window: { __ModuleLoader__: { load: value => { registration = value } }, getComputedStyle: () => ({ gap: '5px' }) },
    ResizeObserver: class { observe() {} disconnect() {} },
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  registration.factory(name => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {}).apply({
    effect: fn => fn(), locale: { register() {}, bind: () => key => key }, configForms: { get: () => ({}) },
    slots: { inject: (_, fn) => fn(), register: (options, component) => { if (options.name === 'conversation.input.dock') launcher = component } },
  })
  sandbox.document = { querySelector: () => null }
  let width = 200
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    if (typeof node.props?.ref === 'function') {
      if ('data-launcher-row' in node.props) node.props.ref({ getBoundingClientRect: () => ({ width }) })
      if ('data-launcher-measure' in node.props) {
        const count = Array.isArray(node.props.children) ? node.props.children.flat(Infinity).filter(x => x?.props?.['data-launcher-measure-action']).length : 0
        node.props.ref({ querySelectorAll: () => Array.from({ length: count }, () => ({ getBoundingClientRect: () => ({ width: 50 }) })), querySelector: () => ({ getBoundingClientRect: () => ({ width: 40 }) }) })
      }
    }
    visit(node.props?.children)
  }
  const render = () => {
    cursor = 0
    visit(launcher({
      useActionForm: fn => fn({ status: 'ready', value: {} }), useInput: fn => fn({ phase: 'plain', draft: '' }),
      useConversation: fn => fn({ views: new Map() }), useSession: fn => fn({ running: false }), useProjection: () => [],
      inputActions: {}, todoStaleMs: 90000, t: key => key,
    }))
    effect()
  }
  render()
  assert.ok(updates > 0, 'initial measurement schedules an update')
  const initial = updates
  for (let i = 0; i < 60; i++) render()
  assert.equal(updates, initial, 'unchanged measurements do not dispatch state updates')
  width = 350
  render()
  assert.ok(updates > initial, 'a changed width still updates the layout')
})
