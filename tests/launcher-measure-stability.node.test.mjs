import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('stable layout measurements do not schedule repeated synchronous updates', () => {
  let registration, launcher, cursor = 0, updates = 0, effect, effectDependencies, resize, cleanup, reads = 0
  const frames = new Map()
  let nextFrame = 0
  const state = [], refs = []
  const react = {
    useEffect() {}, useMemo: fn => fn(),
    useLayoutEffect: (fn, dependencies) => { effect = fn; effectDependencies = dependencies },
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
    ResizeObserver: class { constructor(callback) { resize = callback } observe() {} disconnect() {} },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame },
    cancelAnimationFrame(id) { frames.delete(id) },
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
      if ('data-launcher-row' in node.props) node.props.ref({ getBoundingClientRect: () => { reads++; return { width } } })
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
    cleanup?.()
    cleanup = effect()
  }
  render()
  // The 2026-11-02 dock crash (#185) came from this effect running after every
  // commit: with no dependency array it re-measured and re-dispatched until
  // React's nested-update limit. The dependencies are the structural fix.
  assert.ok(Array.isArray(effectDependencies) && effectDependencies.length === 2,
    'the measurement effect must declare [measurable, measurementKey]')
  assert.ok(updates > 0, 'initial measurement schedules an update')
  const initial = updates
  for (let i = 0; i < 60; i++) render()
  assert.equal(updates, initial, 'unchanged measurements do not dispatch state updates')
  width = 350
  render()
  assert.ok(updates > initial, 'a changed width still updates the layout')
  const beforeResize = reads
  for (let i = 0; i < 60; i++) resize()
  assert.equal(reads, beforeResize, 'resize notifications defer DOM reads')
  assert.equal(frames.size, 1, 'resize bursts share one animation frame')
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach(callback => callback())
  assert.ok(reads > beforeResize, 'the queued frame measures the current DOM')
  resize()
  cleanup()
  assert.equal(frames.size, 0, 'unmount cancels pending measurement')
})

test('draft renders reuse configuration and history until their inputs change', () => {
  let registration, launcher, cursor = 0, parses = 0, historyReads = 0
  const hooks = []
  const react = {
    useEffect() {}, useLayoutEffect() {},
    useMemo(create, dependencies) {
      const i = cursor++
      const previous = hooks[i]
      if (!previous || dependencies.some((value, index) => !Object.is(value, previous.dependencies[index]))) {
        hooks[i] = { dependencies, value: create() }
      }
      return hooks[i].value
    },
    useState(initial) {
      const i = cursor++
      hooks[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [hooks[i].value, value => { hooks[i].value = value }]
    },
    useRef(initial) { return hooks[cursor++] ??= { current: initial } },
  }
  const jsx = (type, props) => ({ type, props })
  const sandbox = {
    window: { __ModuleLoader__: { load: value => { registration = value } } },
    JSON: { stringify: JSON.stringify, parse(text) { parses++; return JSON.parse(text) } },
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  registration.factory(name => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx } })[name] ?? {}).apply({
    effect: fn => fn(), locale: { register() {}, bind: () => key => key }, configForms: { get: () => ({}) },
    slots: { inject: (_, fn) => fn(), register: (options, component) => { if (options.name === 'conversation.input.dock') launcher = component } },
  })
  const action = { id: 'custom', label: 'Custom', kind: 'prompt', prompt: 'Do something', enabled: true, order: 1, description: '', example: '' }
  let actionsJson = JSON.stringify({ version: 1, actions: [action] })
  const messages = [{ role: 'user', text: action.prompt }, { role: 'assistant', text: 'Done' }]
  const makeChat = () => ({ get messages() { historyReads++; return messages } })
  let chat = makeChat(), locale = 'en'
  const t = key => key === 'defaultLocale' ? locale : key
  const render = (draft = '') => {
    cursor = 0
    return launcher({
      useActionForm: fn => fn({ status: 'ready', value: { actionsJson } }),
      useInput: fn => fn({ phase: 'plain', draft, attachmentIds: [] }),
      useConversation: fn => fn({ views: new Map([['chat', chat]]) }),
      useSession: fn => fn({ running: false }), useProjection: () => [],
      inputActions: {}, todoStaleMs: 90000, t,
    })
  }
  render()
  assert.ok(parses > 0)
  assert.ok(historyReads > 0)
  const initialParses = parses, initialReads = historyReads
  for (let i = 0; i < 60; i++) render('draft ' + i)
  assert.equal(parses, initialParses, 'draft changes do not reparse action configuration')
  assert.equal(historyReads, initialReads, 'draft changes do not rescan conversation history')
  chat = makeChat()
  render()
  assert.ok(historyReads > initialReads, 'a new chat snapshot refreshes history')
  assert.equal(parses, initialParses)
  actionsJson = JSON.stringify({ version: 1, actions: [{ ...action, label: 'Renamed' }] })
  render()
  assert.ok(parses > initialParses, 'configuration changes invalidate cached actions')
  const beforeLocale = parses
  locale = 'zh'
  render()
  assert.ok(parses > beforeLocale, 'locale changes invalidate localized configuration')
})
