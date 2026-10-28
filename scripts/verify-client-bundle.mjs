/**
 * Guard the shipped browser bundle against the two failures that keep the
 * launcher invisible in a linked standalone install:
 *
 * 1. DSH keys a client module by the package name, so the bundle must register
 *    that same id. The bundle was once built under the old scoped name.
 * 2. The application-level Remote table never contains a third-party
 *    `remote.codingWorkflow` namespace, so requiring it in the top-level
 *    `inject` list leaves the client fiber waiting forever.
 *
 * Run with `node scripts/verify-client-bundle.mjs`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const bundlePath = new URL('../lib/client.js', import.meta.url)
const bundleSource = readFileSync(bundlePath, 'utf8')

const registered = []
globalThis.window = {
  __ModuleLoader__: {
    load: registration => { registered.push(registration) },
  },
}
await import(pathToFileURL(fileURLToPath(bundlePath)).href)

assert.equal(registered.length, 1, 'lib/client.js must register exactly one module factory')
const registration = registered[0]
assert.equal(registration.id, pkg.name, `bundle id ${JSON.stringify(registration.id)} must equal package name ${JSON.stringify(pkg.name)}`)
assert.ok(bundleSource.includes(`tag.dataset.plugin = ${JSON.stringify(pkg.name)}`), 'CSS tags must be owned by the package name')

const stub = {}
const exports = registration.factory((specifier) => stub[specifier] ??= {})

assert.deepEqual(exports.inject, ['locale', 'slots', 'sessions', 'remote', 'remote.skills', 'configForms'])
assert.equal(typeof exports.apply, 'function')

const registrations = []
let dockOptions
const source = {
  binding: () => ({
    session: {
      getSnapshot: () => ({ openState: 'open' }),
      projections: { faceOf: () => ({ getSnapshot: () => null }) },
    },
  }),
}
const ctx = {
  effect: (create) => { create() },
  on: () => () => {},
  locale: { register: () => {}, bind: () => (key) => key },
  configForms: { get: () => ({ status: 'ready', writable: true, revision: 1, value: {}, subscribe: () => () => {}, mutate: async () => true }) },
  sessions: source,
  remote: { $on: () => () => {}, skills: {} },
  slots: {
    inject: (_name, create) => { create() },
    register: (options) => { registrations.push(options); if (options.name === 'conversation.input.dock') dockOptions = options; return { dispose() {} } },
  },
}

exports.apply(ctx)

assert.deepEqual(registrations.map(options => options.name), ['conversation.input.dock', 'settings.section'])
const injected = dockOptions.inject('session-1')
assert.ok(injected.hooks.workflow, 'the dock must expose a workflow source even when the Host Remote is absent')
assert.equal('pauseWorkflow' in injected, false, 'the dock must not own a native Goal hook')
assert.equal('resumeWorkflow' in injected, false, 'the dock must not own a native Goal hook')
assert.equal('setMode' in injected.workflowCommands, false, 'the dock must not expose a mode command')
const result = await injected.workflowCommands.approve('ship it')
assert.deepEqual(result, { ok: false, message: 'Coding workflow remote unavailable' })

console.log(`OK ${pkg.name}: client bundle registers itself, mounts the input dock, and degrades when remote.codingWorkflow is unavailable.`)
