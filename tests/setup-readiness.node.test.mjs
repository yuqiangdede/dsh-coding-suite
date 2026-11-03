import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProjectSetup } from '../src/client/setup-readiness.ts'

const complete = {
  'AGENTS.md': '## Agent skills\nSee docs/agents/issue-tracker.md and docs/agents/domain.md; docs/agents/document-layout.md; docs/pocket/README.md',
  'docs/agents/issue-tracker.md': '# Issue tracker\nGitHub',
  'docs/agents/domain.md': '# Domain docs\nProject index: docs/pocket/README.md',
  'docs/pocket/README.md': '# Project knowledge index',
  'docs/_work/README.md': '# Work root',
  'docs/agents/document-layout.md': '<!-- dsh-document-layout:v1 -->\n- 知识索引: `docs/pocket/README.md`\n- 中间产物根目录: `docs/_work/`\n- 临时缓存根目录: `docs/_work/`\n## 按类别选择路径\n| 正式需求 | docs |\n| 设计与架构 | docs |\n| 接口与数据库 | docs |\n| 验收与交接 | docs |\n| 中间阶段成果 | docs |\n| 临时缓存 | docs |\n| 外部工单 | docs |',
}
const check = (files, names = ['setup-matt-pocock-skills']) =>
  evaluateProjectSetup(async path => files[path] ?? null, names)

test('already configured projects are ready without a persisted flag', async () => {
  assert.deepEqual(await check(complete), { ready: true, missing: [] })
})
test('accepts equivalent layout formatting and separate category rows', async () => {
  const layout = complete['docs/agents/document-layout.md']
    .replace('- 中间产物根目录: `docs/_work/`', '- **中间产物根目录**： `docs/_work`')
    .replace('- 临时缓存根目录: `docs/_work/`', '- 临时缓存根目录： `docs/_work/<task-id>/tmp/`')
    .replace('| 正式需求 | docs |', '|需求| docs |')
    .replace('| 设计与架构 | docs |', '|设计| docs |')
    .replace('| 接口与数据库 | docs |', '|接口| docs |\n|数据库| docs |')
    .replace('| 验收与交接 | docs |', '|验收| docs |\n|交接| docs |')
    .replace('| 中间阶段成果 | docs |', '|Gate/评审| docs |')
  assert.deepEqual(await check({ ...complete, 'docs/agents/document-layout.md': layout }), { ready: true, missing: [] })
  const unsafe = layout.replace('docs/_work/<task-id>/tmp/', 'docs/_work/<task-id>/../../outside/')
  assert((await check({ ...complete, 'docs/agents/document-layout.md': unsafe })).missing.some(value => value.includes('临时缓存目录路径无效')))
})
test('accepts a task workspace root and categories from an existing project', async () => {
  const layout = `<!-- dsh-document-layout:v1 -->
- 知识索引: \`docs/pocket/README.md\`
- 设计类中间产物根: \`docs/Design/中间文档/<阶段>/\`
- 任务工作根: \`docs/_work/<task-id>/\`
- 临时缓存根: \`docs/_work/<task-id>/tmp/\`
| 需求规格 | docs |
| 总体/概要/详细设计 | docs |
| 数据库设计 | docs |
| 架构决策 | docs |
| 接口与联调 | docs |
| 验收与运行健康 | docs |
| 交接 | docs |
| 设计类中间产物（概要/数据库） | docs |
| 临时缓存 | docs |
| 外部工单 | docs |`
  assert.deepEqual(await check({ ...complete, 'docs/agents/document-layout.md': layout }), { ready: true, missing: [] })
})
test('new projects are blocked', async () => {
  const result = await check({})
  assert.equal(result.ready, false)
  assert(result.missing.some(text => text.includes('AGENTS.md')))
})
test('missing tracker, index, and Skill are independently reported', async () => {
  const files = { ...complete }
  delete files['docs/agents/issue-tracker.md']
  delete files['docs/pocket/README.md']
  const result = await check(files, [])
  assert.equal(result.ready, false)
  assert(result.missing.some(text => text.includes('issue-tracker.md')))
  assert(result.missing.some(text => text.includes('知识索引')))
  assert(result.missing.some(text => text.includes('Skill')))
})
test('existing alternative index with CLAUDE instructions passes', async () => {
  const files = {
    'CLAUDE.md': '## Agent skills\nSee docs/agents/issue-tracker.md docs/agents/domain.md docs/agents/document-layout.md docs/README.md',
    'docs/agents/issue-tracker.md': '# issue tracker',
    'docs/agents/domain.md': '# Domain\nSee docs/README.md',
    'docs/README.md': '# Existing docs index',
    'docs/agents/document-layout.md': complete['docs/agents/document-layout.md'].replaceAll('docs/pocket/README.md', 'docs/README.md'),
    'docs/_work/README.md': '# Work root',
  }
  assert.equal((await check(files)).ready, true)
})
test('both root instruction files must carry valid pointers', async () => {
  const result = await check({ ...complete, 'CLAUDE.md': '# empty' })
  assert.equal(result.ready, false)
  assert(result.missing.some(text => text.includes('CLAUDE.md')))
})
test('document routing contract and real work directory are required', async () => {
  const files = { ...complete }
  delete files['docs/agents/document-layout.md']
  assert((await check(files)).missing.some(value => value.includes('document-layout.md')))
  files['docs/agents/document-layout.md'] = complete['docs/agents/document-layout.md']
  delete files['docs/_work/README.md']
  assert((await check(files)).missing.some(value => value.includes('README.md')))
  files['docs/_work/README.md'] = '# work'
  files['docs/agents/document-layout.md'] = complete['docs/agents/document-layout.md'].replace('docs/_work/', '../escape/')
  assert((await check(files)).missing.some(value => value.includes('目录路径')))
})
test('remote read errors never become success', async () => {
  await assert.rejects(() => evaluateProjectSetup(async () => { throw Error('offline') }, ['setup-matt-pocock-skills']), /offline/)
})
