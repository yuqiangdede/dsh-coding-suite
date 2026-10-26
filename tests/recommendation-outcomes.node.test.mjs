import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { recommend } from '../src/client/contextual-actions.ts'
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
  ]) {
    assert.deepEqual(result('/implement 按已确认规格开发', summary + suffix)?.ids, ['compile', 'review'], suffix)
  }
})

test('actual build/test failures and interrupted turns still recommend diagnosis', () => {
  for (const text of [
    '实现完成但测试失败',
    '构建失败',
    '编译失败',
    'tests failed',
    'build failed',
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
