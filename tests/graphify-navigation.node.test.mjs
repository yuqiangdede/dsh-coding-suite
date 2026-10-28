import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_ACTIONS, missingDefaultActions, encodeActions, parseActions } from '../src/client/actions.ts'
import { LAUNCHER_GROUPS } from '../src/client/launcher-layout.ts'

test('graph navigation is discoverable without changing existing saved actions', () => {
  const action = DEFAULT_ACTIONS.find(a => a.id === 'graphify-navigation')
  assert.equal(action?.skillId, 'graphify-navigation')
  assert.equal(action?.enabled, true)
  assert.ok(LAUNCHER_GROUPS.find(g => g.id === 'others').actionIds.includes(action.id))
  const saved = DEFAULT_ACTIONS.filter(a => a.id !== action.id).map(a => ({ ...a }))
  assert.deepEqual(parseActions(encodeActions(saved)), saved)
  assert.deepEqual(missingDefaultActions(saved).map(a => a.id), [action.id])
})

test('bundled skill requires explicit operations and keeps the code-only boundary', () => {
  const skill = readFileSync(new URL('../assets/skills/graphify-navigation/SKILL.md', import.meta.url), 'utf8')
  assert.match(skill, /graphify extract \. --code-only/)
  assert.match(actionPrompt(), /自动安装官方 graphifyy/)
  assert.match(skill, /automatically install it if missing/)
  assert.match(skill, /No automatic startup job, file watcher, Git hook/)
  assert.match(skill, /Verify important relationships/)
  const setup = readFileSync(new URL('../assets/skills/setup-matt-pocock-skills/SKILL.md', import.meta.url), 'utf8')
  assert.match(setup, /do not install, build, start a watcher, or modify hooks/)
})

function actionPrompt() {
  return DEFAULT_ACTIONS.find(a => a.id === 'graphify-navigation').prompt
}
