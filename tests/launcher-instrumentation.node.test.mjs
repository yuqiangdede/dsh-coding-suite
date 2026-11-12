import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

/**
 * The shipped client must never re-arm the temporary launcher-disappearance
 * probe. Its record replays as a fixed banner on every start, so a stored
 * report from an old build looks like a live crash until it is dismissed.
 */
const PROBE_STORE = 'dsh-coding-suite:launcher-probe'
const PROBE_BANNER = 'data-dsh-launcher-probe'

test('the shipped client installs no disappearance probe or console hijack', () => {
  const appended = []
  const makeNode = () => {
    const node = {
      attributes: {},
      dataset: {},
      style: {},
      textContent: '',
      setAttribute(name, value) { node.attributes[name] = value },
      getAttribute(name) { return node.attributes[name] ?? null },
      addEventListener() {},
      remove() { node.removed = true },
    }
    return node
  }
  // A stored record from an earlier build: the probe would replay it on start.
  const stored = JSON.stringify({
    at: '2026-11-02T06:55:38.722Z',
    outlet: true,
    crashFaces: ['conversation.input.dock'],
    anchors: [],
    composer: true,
    events: [],
  })
  const originalError = () => {}
  let registration
  const sandbox = {
    window: {
      __ModuleLoader__: { load: value => { registration = value } },
      addEventListener() {},
      getComputedStyle: () => ({ gap: '5px' }),
      setInterval: () => 1,
      setTimeout: () => 1,
    },
    document: {
      body: { appendChild: node => { appended.push(node) } },
      head: { appendChild() {} },
      createElement: () => makeNode(),
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    localStorage: { getItem: key => key === PROBE_STORE ? stored : null, setItem() {} },
    MutationObserver: class { constructor(callback) { this.callback = callback } observe() {} disconnect() {} },
    console: { error: originalError },
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), sandbox)
  assert.ok(registration, 'the shipped bundle must register a module')
  const jsx = () => null
  const react = {
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect() {}, useLayoutEffect() {}, useCallback: fn => fn,
    useMemo: fn => fn(), useRef: initial => ({ current: initial }),
  }
  const mod = registration.factory(name => name === 'react' ? react
    : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: Symbol.for('react.fragment') } : {})
  const registrations = []
  mod.apply({
    effect: fn => fn(),
    locale: { register() {}, bind: () => key => key },
    configForms: { get: () => ({ subscribe() {}, getSnapshot() { return {} }, mutate: async () => true }) },
    slots: {
      inject: (_name, register) => register(),
      register: (options) => { registrations.push(options.name); return { dispose() {} } },
    },
  })
  assert.deepEqual(registrations, ['conversation.input.dock', 'settings.section'],
    'apply must still wire both launcher surfaces')
  const banners = appended.filter(node => PROBE_BANNER in node.attributes)
  assert.equal(banners.length, 0,
    'apply appended a launcher probe banner; a stored record would replay on every start')
  assert.equal(sandbox.console.error, originalError,
    'apply replaced console.error with the probe recorder')
})
