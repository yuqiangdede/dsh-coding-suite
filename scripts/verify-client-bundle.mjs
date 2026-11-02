/**
 * Guard the shipped browser bundle against the two failures that keep the
 * launcher invisible in a linked standalone install:
 *
 * 1. DSH keys a client module by the package name, so the bundle must register
 *    that same id. The bundle was once built under the old scoped name.
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
const hostSource = readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8')
assert.doesNotMatch(bundleSource, /codingWorkflow|workflowCommands|WorkflowPanel/, 'browser bundle must not contain the retired workflow')
assert.doesNotMatch(hostSource, /CodingWorkflowService|verificationTimeoutMs/, 'Host bundle must not load the retired workflow')
assert.match(hostSource, /artifactRouting/, 'Host must inject document layout rules into bundled Skills')
assert.match(hostSource, /content: content \+ "\\n\\n" \+ artifactRouting/, 'Host must apply artifact routing to skill content')

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

assert.deepEqual(exports.inject, ['locale', 'slots', 'sessions', 'remote', 'remote.skills', 'remote.workspaceFiles', 'configForms'])
assert.equal(typeof exports.apply, 'function')

const registrations = []
let dockOptions
const source = {
  list: { getSnapshot: () => ({ byId: { 'session-1': { cwd: 'C:/repo' } } }) },
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
assert.ok(injected.hooks.actionForm, 'launcher configuration must remain available')
assert.equal(injected.projectRoot, 'C:/repo')
assert.equal(typeof injected.checkProjectSetup, 'function')
assert.equal('workflowCommands' in injected, false, 'retired workflow commands must be absent')

console.log(`OK ${pkg.name}: client bundle registers itself, mounts the input dock, without retired workflow remotes.`)
