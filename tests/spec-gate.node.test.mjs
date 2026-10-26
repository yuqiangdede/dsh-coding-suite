import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requirementsReady } from '../src/client/contextual-actions.ts'
import { DEFAULT_ACTIONS } from '../src/client/actions.ts'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { zh } from '../src/client/locales.ts'

const user = text => ({ role: 'user', text })
const reply = (text, interrupted = false) => ({ role: 'assistant', text, interrupted })
const ready = (messages, running = false) => requirementsReady({ messages }, running, DEFAULT_ACTIONS)

test('spec starts locked and unlocks after either discussion concludes', () => {
  assert.equal(ready([]), false)
  for (const skill of ['grill-with-docs', 'grill-with-ui']) {
    assert.equal(ready([user('/' + skill), reply('请先确认范围')]), false)
    assert.equal(ready([user('/' + skill), reply('需求已确认')]), true)
  }
})

test('readiness survives follow-ups and unrelated turns but never crosses sessions', () => {
  const history = [user('/grill-with-docs'), reply('请确认范围'), user('只做搜索'), reply('讨论结论：需求已确认'), user('/research'), reply('研究完成')]
  assert.equal(ready(history), true)
  assert.equal(ready(history, true), false)
  assert.equal(ready([]), false)
  assert.equal(ready([user('/research'), reply('需求已确认')]), false)
  assert.equal(ready([user('/grill-with-ui'), reply('需求已确认', true)]), false)
  assert.equal(ready([user('/grill-with-docs'), { kind: 'turn-error', message: 'failed' }]), false)
})

test('questions, negated conclusions, and later turn errors cannot unlock spec', () => {
  for (const text of ['需求已确认了吗？请先确认范围。', '讨论结论：尚待确认范围', '需求未确认，暂无讨论结论']) {
    assert.equal(ready([user('/grill-with-docs'), reply(text)]), false, text)
  }
  assert.equal(ready([user('/grill-with-docs'), reply('需求已确认'), { kind: 'turn-error', message: 'failed' }]), false)
  assert.equal(ready([user('/grill-with-docs'), reply('请确认范围'), user('请编译项目'), reply('构建通过，需求已确认')]), false)
})

test('requirement answers may mention workflow features and literal question marks', () => {
  assert.equal(ready([user('/grill-with-docs'), reply('要支持哪些开发功能？'), user('需要支持编译和代码审查'), reply('讨论结论：需求已确认，支持编译和代码审查。')]), true)
  assert.equal(ready([user('/grill-with-docs'), reply('讨论结论：需求已确认。搜索语法中 ? 表示单字符通配符。')]), true)
  assert.equal(ready([user('/grill-with-docs'), reply('讨论结论尚不明确，还需要补充目标用户。')]), false)
  assert.equal(ready([user('/grill-with-docs'), reply('请确认范围'), user('翻译 confirmed requirements 这句话'), reply('confirmed requirements 的意思是已确认的需求。')]), false)
})

test('shipped launcher disables spec and rejects clicks until discussion conclusion', async () => {
  let registration
  const jsx = (type, props) => ({ type, props })
  const hooks = { useEffect() {}, useId: () => 'test', useMemo: fn => fn(), useRef: value => ({ current: value }), useState: value => [value, () => {}] }
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
    sessions: {}, remote: { $on: () => () => {}, goals: {}, skills: {} },
    slots: { inject: (_, fn) => fn(), register: (options, component) => {
      if (options.name === 'conversation.input.dock') Launcher = component
      return { dispose() {} }
    } },
  })
  const buttons = node => {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(buttons)
    return [...(node.type === 'button' ? [node] : []), ...buttons(node.props?.children)]
  }
  let insertions = 0
  const render = messages => Launcher({
    useActionForm: fn => fn({ status: 'ready', value: {} }),
    useInput: fn => fn({ phase: 'plain', draft: '' }),
    useConversation: fn => fn({ views: new Map([['chat', { messages }]]) }),
    useSession: fn => fn({ running: false }),
    useWorkflow: fn => fn({ item: null }), useProjection: () => [],
    inputActions: { captureInsertion: () => ({ start: 0, end: 0 }), insertText: () => { insertions++; return true }, persistDraft() {} },
    fetchSkillNames: async () => ['to-spec'], todoStaleMs: 90000,
    t: key => zh[key] ?? key,
  })
  const spec = messages => buttons(render(messages)).find(node => node.props.children === '固化需求')
  let button = spec([])
  assert.equal(button.props.disabled, true)
  button.props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(insertions, 0)
  button = spec([user('/grill-with-docs'), reply('需求已确认')])
  assert.equal(button.props.disabled, false)
  button.props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(insertions, 1)
})
