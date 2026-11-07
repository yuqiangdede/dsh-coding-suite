import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { recommend, withEvidence } from '../src/client/contextual-actions.ts'
import { DEFAULT_ACTIONS } from '../src/client/actions.ts'

const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const start = bundle.indexOf('//#region lib/types/client/contextual-actions.js')
assert.notEqual(start, -1)
const end = bundle.indexOf('//#endregion', start)
assert.notEqual(end, -1)
const publishedRecommend = runInNewContext(bundle.slice(start, end) + '\nrecommend')

const summary = '实现完成（仅按已确认规格）。未做代码审查/走读、未完整编译、未提交。'
const result = (request, text, failed = false) => {
  const entries = [
    { role: 'user', text: request, seq: 1 },
    { role: 'assistant', text, seq: 2, failed },
  ]
  const source = recommend(entries, false, DEFAULT_ACTIONS)
  const published = publishedRecommend(entries, false, DEFAULT_ACTIONS)
  assert.deepEqual(JSON.parse(JSON.stringify(published)), source, 'published recommendation matches source')
  return source
}

test('completed implementation recommends review and compile despite pending follow-ups', () => {
  for (const suffix of [
    '',
    '\n未完成项：代码审查、完整编译、提交。',
    '\n代码审查未完成；完整编译未完成；提交未完成。',
    '\n无未完成项。',
    '\n已验证播放中断恢复场景。',
    '\n未出现测试失败；没有构建失败；无编译失败。',
    '\n未发现任何测试失败。',
  ]) {
    assert.deepEqual(result('/implement 按已确认规格开发', summary + suffix)?.ids, ['compile', 'review'], suffix)
  }
})

test('implementation completion may precede the stage name', () => {
  assert.deepEqual(result('/implement 按已确认规格开发', '已完成实现，建议代码审查。')?.ids, ['compile', 'review'])
})

test('actual build/test failures and interrupted turns still recommend diagnosis', () => {
  for (const text of [
    '实现完成但测试失败',
    '构建失败',
    '编译失败',
    'tests failed',
    'build failed',
    '未出现测试失败，但构建失败',
    '任务未完成',
    '开发未完成',
    '请求中断',
    '执行被中断',
    '无法继续',
  ]) {
    assert.deepEqual(result('/implement 按已确认规格开发', text)?.ids, ['bug', 'continue'], text)
  }
  assert.deepEqual(result('/implement 按已确认规格开发', summary, true)?.ids, ['bug', 'continue'])
})

test('review interruption and findings preserve their existing next steps', () => {
  for (const [text, ids] of [
    ['走读进行到一半被中断，未给出结论', ['review-fix', 'bug']],
    ['审查完成：未发现问题，但扫描过程中断', ['bug', 'continue']],
    ['审查结果：P1 src/a.ts:20 空指针问题', ['review-fix']],
  ]) {
    assert.deepEqual(result('请代码审查', text)?.ids, ids, text)
  }
})

test('completed repairs advance despite report headings, resolved severity ids and empty lists', () => {
  const action = DEFAULT_ACTIONS.find(action => action.id === 'review-fix')
  const requests = [
    withEvidence(action.prompt, null, 'review-fix'),
    '只修复当前对话中已明确的审查问题或测试失败证据：逐项定位、最小修改并运行相关回归测试。',
    '请根据当前对话上一轮审查报告，逐项修复全部明确问题。',
  ]
  for (const request of requests) {
    for (const suffix of [
      '以下是逐项状态、验证结果和未修复项。\nR-01（P1）已修复，回归通过。',
      'R-01（P1）已修复。\n### 三、未修复项\n无。',
      '无未修复项；没有剩余问题。',
      '未修复项：无。',
    ]) {
      const recommendation = result(request, '按原报告逐项修复完成，未提交。' + suffix)
      assert.deepEqual(recommendation?.ids, ['compile', 'review'], request + suffix)
      assert.equal(recommendation?.reason, 'reasonRepairReady')
    }
  }
})

test('actual remaining findings still recommend repair with or without a summary heading', () => {
  for (const suffix of [
    'R-02 未修复，需要确认权限模型。',
    '未修复项：R-02 越权问题。',
    '以下是未修复项：R-02 未修复。',
    '未修复项：无。\n但 R-03 仍有并发问题。',
  ]) {
    assert.deepEqual(result('请根据审查报告逐项修复', '已修复 R-01。' + suffix)?.ids, ['review-fix'])
  }
})
