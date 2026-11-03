import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_ACTIONS, encodeActions, parseActions, missingDefaultActions, ENGLISH_DEFAULT_PRESENTATION } from '../src/client/actions.ts'
import { LAUNCHER_GROUPS, actionsForGroup, defaultLauncherLayout, parseLauncherLayout, exportLauncherConfiguration, importedLauncherLayout } from '../src/client/launcher-layout.ts'
import { en, zh, receivingInstructions } from '../src/client/locales.ts'

const base = resolve(import.meta.dirname, '..')
const skillRoot = resolve(base, 'assets/skills')
const retiredIds = ['handover-overview', 'handover-features', 'handover-flows', 'handover-troubleshooting', 'handover-maintain']
const ids = ['handover-log-guide', 'handover-requirement-summary']
const skillIds = ids.map(id => id.replace('handover-', 'project-handover-'))

test('one handover action, canonical group and localized labels', () => {
  const groups = LAUNCHER_GROUPS.map(group => group.id)
  assert.deepEqual(groups, ['requirements-analysis', 'development', 'documents', 'handover-docs', 'others'])
  assert.deepEqual(LAUNCHER_GROUPS.find(g => g.id === 'handover-docs').actionIds, [...ids, 'doc-merge'])
  assert.deepEqual(LAUNCHER_GROUPS.find(g => g.id === 'documents').actionIds,
    ['api-docs', 'requirements', 'overview', 'outline', 'database', 'doc-merge', 'docx'])
  assert.equal(zh.groupDocuments, '验收文档')
  assert.equal(en.groupDocuments, 'Acceptance Docs')
  assert.equal(zh.groupHandoverDocs, '交接文档')
  assert.equal(en.groupHandoverDocs, 'Project Handover')
  const actions = ids.map(id => DEFAULT_ACTIONS.find(a => a.id === id))
  assert(actions.every(Boolean))
  assert.deepEqual(actions.map(a => a.label), ['日志排查', '追溯需求'])
  assert.deepEqual(actions.map(a => a.skillId), skillIds)
  assert(actions.every(a => a.kind === 'skill' && a.enabled && !a.pinned))
  assert.deepEqual(actionsForGroup('handover-docs', DEFAULT_ACTIONS, defaultLauncherLayout(DEFAULT_ACTIONS)).map(a => a.id), [...ids, 'doc-merge'])
  assert(ids.every(id => !defaultLauncherLayout(DEFAULT_ACTIONS).commonActionIds.includes(id)))
  assert(ids.every(id => ENGLISH_DEFAULT_PRESENTATION[id] && receivingInstructions[id]?.length === 2))
  assert(retiredIds.every(id => !DEFAULT_ACTIONS.some(a => a.id === id)))
  const old = retiredIds.map(id => ({ id, label: id, kind: 'skill', skillId: 'project-' + id, prompt: '', enabled: true, order: 1, description: '', example: '' }))
  const layout = { ...defaultLauncherLayout(old), commonActionIds: retiredIds }
  assert.deepEqual(actionsForGroup('common', old, layout), [])
  assert.deepEqual(actionsForGroup('others', old, layout), [])
  assert(retiredIds.every(id => !existsSync(resolve(skillRoot, 'project-' + id))))
})

test('the previous saved label is renamed without changing custom labels or bindings', () => {
  const preset = DEFAULT_ACTIONS.find(a => a.id === 'handover-requirement-summary')
  const parse = action => parseActions(encodeActions([action]))[0]
  assert.equal(parse({ ...preset, label: '需求汇总' }).label, '追溯需求')
  assert.equal(parse({ ...preset, label: '自定义名称' }).label, '自定义名称')
  assert.equal(parse({ ...preset, label: '需求汇总', skillId: 'custom-skill' }).label, '需求汇总')
})

test('old visibility, custom actions and pinned order survive migration', () => {
  const saved = { schemaVersion: 1, visibleGroups: { common: false, development: true, documents: true, others: false }, commonActionIds: ['custom-action', 'bug'] }
  const custom = { id: 'custom-action', label: 'Custom', kind: 'prompt', prompt: 'do not overwrite', enabled: true, pinned: true, order: 12, description: '', example: '' }
  const existing = DEFAULT_ACTIONS.filter(a => !ids.includes(a.id))
  existing.push(custom)
  const persisted = encodeActions(existing)
  const loaded = parseActions(persisted)
  assert.deepEqual(loaded, existing)
  assert.deepEqual(missingDefaultActions(loaded).map(a => a.id), ids)
  const layout = parseLauncherLayout(JSON.stringify(saved), loaded, true)
  assert.equal(layout.visibleGroups.documents, true)
  assert.equal(layout.visibleGroups['handover-docs'], false)
  assert.deepEqual(layout.commonActionIds, saved.commonActionIds)
  const imported = importedLauncherLayout(exportLauncherConfiguration(persisted, layout), loaded, layout)
  assert.deepEqual(imported, layout)
  assert.throws(() => parseLauncherLayout(JSON.stringify({ ...saved, visibleGroups: { ...saved.visibleGroups, 'handover-docs': 'true' } }), loaded))
})

test('all bundled handover skills and shared resources are present offline', () => {
  for (const name of skillIds) {
    const path = resolve(skillRoot, name, 'SKILL.md')
    assert(existsSync(path), path)
    const skill = readFileSync(path, 'utf8')
    assert.match(skill, new RegExp('name: ' + name + '\\b'))
    assert.match(skill, /共享|规程/)
    assert.match(skill, /明确确认/)
  }
  for (const name of ['protocol.md', 'evidence.md', 'templates.md', 'updates.md', 'scripts/handover_write_guard.py']) {
    assert(existsSync(resolve(skillRoot, '_shared/project-handover', name)), name)
  }
  const guide = readFileSync(resolve(skillRoot, 'project-handover-log-guide/SKILL.md'), 'utf8')
  assert.match(guide, /开发实现阶段确认的日志记录/)
  assert.match(guide, /不证明日志已经实现/)
  assert.match(guide, /只读定位步骤/)
  const svn = readFileSync(resolve(skillRoot, 'project-handover-requirement-summary/SKILL.md'), 'utf8')
  assert.match(svn, /SVN.*提交|提交.*SVN/)
  assert.match(svn, /svn log --xml -v/)
  assert.match(svn, /去重|归并/)
  assert.match(svn, /明确批准|明确确认/)
  assert.match(svn, /requirement-trace\/<任务ID>\/requirements-from-svn\.md/)
  assert.match(svn, /不同任务使用不同 ID/)
  const protocol = readFileSync(resolve(skillRoot, '_shared/project-handover/protocol.md'), 'utf8')
  assert.match(protocol, /explicit approval/)
  assert.match(protocol, /Production status/)
})

test('published browser bundle contains the same action defaults and group', () => {
  const bundle = readFileSync(resolve(base, 'lib/client.js'), 'utf8')
  const m = /\t\tconst DEFAULT_ACTIONS = ([\s\S]*?\n\t\t\]);/.exec(bundle)
  assert(m)
  const published = JSON.parse(m[1])
  assert.deepEqual(published.filter(a => ids.includes(a.id)), DEFAULT_ACTIONS.filter(a => ids.includes(a.id)))
  assert.match(bundle, /groupHandoverDocs/)
  assert.match(bundle, /成果物约定：本次追溯结果统一写成/)
  assert.match(bundle, /'handover-docs': false/)
  assert.match(bundle, /'groupDocuments': '验收文档'/)
})
