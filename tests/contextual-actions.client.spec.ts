import { describe, expect, it } from 'vitest'
import { chatEntries, recommend, withEvidence, type ChatEntry } from '../src/client/contextual-actions.ts'
import { DEFAULT_ACTIONS } from '../src/client/actions.ts'

const user = (text: string, seq = 1): ChatEntry => ({ role: 'user', text, seq })
const assistant = (text: string, seq = 2, failed = false): ChatEntry => ({ role: 'assistant', text, seq, failed })
const button = (id: string) => {
  const action = DEFAULT_ACTIONS.find(candidate => candidate.id === id)
  if (!action) throw new Error('missing default action ' + id)
  return action
}

describe('Skill Launcher contextual recommendations', () => {
  it('reads only the latest completed DSH legacy exchange in sequence order', () => {
    expect(chatEntries(null)).toEqual([])
    expect(chatEntries({ legacy: { nodes: null }, items: null })).toEqual([])
    expect(chatEntries({ legacy: { nodes: [
      { kind: 'user', seq: 1, content: [{ type: 'text', text: '更早请求' }] },
      { kind: 'user', seq: 10, content: [{ type: 'text', text: '请代码审查' }] },
      { kind: 'assistant', seq: 20, blocks: [{ kind: 'text', text: '审查完成：P1 空指针问题' }] },
      { kind: 'tool-result', seq: 30, content: [{ type: 'text', text: 'ignore tool text' }] },
    ] } })).toEqual([
      user('请代码审查', 10),
      assistant('审查完成：P1 空指针问题', 20),
    ])
    expect(chatEntries({ legacy: { nodes: [
      { kind: 'assistant', seq: 32, blocks: [{ kind: 'text', text: 'older result' }] },
      { kind: 'user', seq: 33, content: [{ type: 'text', text: 'unanswered latest request' }] },
    ] } })).toEqual([])
  })

  it('supports wrapped and alternate view node collections without including tools', () => {
    expect(chatEntries({ items: [
      { data: { node: { kind: 'user', seq: 4, content: [{ type: 'text', text: 'build' }] } } },
      { data: { message: { role: 'assistant', seq: 5, text: 'build passed' } } },
    ] })).toEqual([user('build', 4), assistant('build passed', 5)])
    expect(chatEntries({ entries: [
      { role: 'user', text: 'hello' },
      { role: 'assistant', blocks: [{ kind: 'text', text: 'world' }, null, { kind: 'image' }] },
    ] }).map(({ role, text }) => [role, text])).toEqual([['user', 'hello'], ['assistant', 'world']])
    expect(chatEntries({ messages: [
      { kind: 'user', text: 'review' },
      { kind: 'turn-error', seq: 7, message: 'request failed' },
    ] })).toEqual([user('review', 0), assistant('request failed', 7, true)])
    expect(chatEntries({ legacy: { nodes: [
      { kind: 'user', seq: 8, content: [{ type: 'text', text: 'review' }] },
      { kind: 'assistant', seq: 9, interrupted: true, blocks: [{ kind: 'text', text: 'interrupted output' }] },
    ] } })[1]?.failed).toBe(true)
  })

  it('recommends the next workflow step for every supported transition', () => {
    expect(recommend([user('请代码审查'), assistant('审查结果：P1 src/a.ts:20 空指针问题')])?.ids).toEqual(['review-fix'])
    expect(recommend([user('需求讨论'), assistant('需求已确认')])?.ids).toEqual(['spec'])
    expect(recommend([user('固化需求'), assistant('规格文档已生成，验收标准完整')])?.ids).toEqual(['plan'])
    expect(recommend([user('制定计划'), assistant('计划已完成')])?.ids).toEqual(['execute'])
    expect(recommend([user('执行开发'), assistant('实现完成')])?.ids).toEqual(['compile', 'review'])
    expect(recommend([user('修复问题'), assistant('修复已成功')])?.ids).toEqual(['compile', 'review'])
    expect(recommend([user('编译'), assistant('编译成功')])?.ids).toEqual(['commit'])
  })

  it('recommends review repair for walkthrough wording and file evidence without severity ids', () => {
    expect(recommend([user('代码走读'), assistant('走读结论：发现 3 处问题，其中并发处理失败场景未覆盖')])?.ids).toEqual(['review-fix'])
    expect(recommend([user('请做代码评审'), assistant('发现问题：packages/a/src/b.ts:12 未校验返回值')])?.reason).toBe('reasonReviewFindings')
    expect(recommend([user('review the auth module'), assistant('Finding: packages/auth/src/token.ts:42 ignores expiry')])?.ids).toEqual(['review-fix'])
    expect(recommend([user('代码走读'), assistant('走读结论：未发现问题')])?.reason).toBe('reasonReviewClean')
    expect(recommend([user('代码走读'), assistant('走读结论：有 3 项未完成')])?.ids).toEqual(['review-fix'])
  })

  it('keeps review repair alongside bug diagnosis when a review turn stops without a result', () => {
    expect(recommend([user('代码走读'), assistant('走读进行到一半被中断，未给出结论')])).toEqual({
      ids: ['review-fix', 'bug'],
      evidence: '走读进行到一半被中断，未给出结论',
      reason: 'reasonPreviousFailed',
    })
    expect(recommend([user('代码审查'), assistant('审查完成：未发现问题，但扫描过程中断')])?.ids).toEqual(['bug', 'continue'])
  })

  it('reserves failure signals for stopped turns rather than issue wording', () => {
    expect(recommend([user('开发'), assistant('实现完成，但日志仍打印 error: 空指针')])?.ids).toEqual(['compile', 'review'])
    expect(recommend([user('请代码审查'), assistant('审查结论：error: 未捕获异常，见 src/a.ts:20')])?.ids).toEqual(['review-fix'])
    expect(recommend([user('执行开发'), assistant('构建失败')])?.ids).toEqual(['bug', 'continue'])
  })

  it('handles running, unrelated, empty, negative, conflicting, and failed results safely', () => {
    expect(recommend([user('请代码审查')])).toBeNull()
    expect(recommend([user('请代码审查'), assistant('审查结果：P1 缺陷')], true)).toBeNull()
    expect(recommend([user('闲聊'), assistant('审查结果：P1 缺陷')])).toBeNull()
    expect(recommend([user('请代码审查'), assistant('   ')])).toBeNull()
    expect(recommend([assistant('审查结果：P1 缺陷'), user('请代码审查')])).toBeNull()
    expect(recommend([user('请代码审查'), assistant('审查完成：未发现任何问题')])?.reason).toBe('reasonReviewClean')
    expect(recommend([user('请代码审查'), assistant('自动检查未发现问题，但人工审查发现 P1 src/a.ts:10 缺陷')])?.ids).toEqual(['review-fix'])
    expect(recommend([user('请代码审查'), assistant('审查中，没有发现结果')])).toBeNull()
    expect(recommend([user('执行开发'), assistant('构建失败')])?.ids).toEqual(['bug', 'continue'])
    expect(recommend([user('其他操作'), assistant('请求中断', 2, true)])?.ids).toEqual(['bug', 'continue'])
    expect(recommend([user('请代码审查'), assistant('审查结果：P1 缺陷', 2, true)])?.ids).toEqual(['review-fix'])
    expect(recommend([user('执行开发'), assistant('实现完成但测试失败')])?.ids).toEqual(['bug', 'continue'])
    expect(recommend([user('请代码审查'), assistant('闲聊')])).toBeNull()
  })

  it('references the original report without copying the earlier exchange', () => {
    const exchange = [user('请代码审查'), assistant('审查结果：P1 src/a.ts:20 空指针问题')]
    const repaired = withEvidence('修复问题', null, 'review-fix', exchange)
    expect(repaired).not.toContain('src/a.ts:20')
    expect(repaired).toContain('以原报告为准，不遗漏、不扩大范围')
    expect(repaired).toContain('问题编号')
    for (const actionId of ['execute', 'compile', 'commit', 'review', 'handoff', 'discussion', 'api-docs']) {
      const draft = withEvidence('任务', null, actionId, exchange)
      expect(draft).not.toContain('src/a.ts:20')
      expect(draft).not.toContain('【上一阶段对话摘录')
      expect(draft).not.toContain('摘录仅供参考')
    }
    const result = recommend(exchange)
    expect(withEvidence('修复问题', result, 'review-fix')).not.toContain('src/a.ts:20')
    expect(withEvidence('编译', result, 'compile')).not.toContain('src/a.ts:20')
  })
  it.each([
    ['/to-tickets 按规格拆分', '工单已创建', ['execute']],
    ['/implement 按工单开发', '实现完成', ['compile','review']],
    ['/research 查证资料', '研究完成，资料来源已记录', ['discussion']],
    ['/prototype 验证状态', '原型完成', ['discussion']],
    ['/improve-codebase-architecture 分析模块', '候选方案已列出', ['discussion']],
    ['/domain-modeling 澄清概念', '术语表已更新', ['discussion']],
    ['/handoff 交接任务', '交接文档：handoff.md', ['continue']],
  ])('recommends after the current Matt action %s', (request, response, ids) => {
    expect(recommend([user(request), assistant(response)])?.ids).toEqual(ids)
  })
  it('keeps receiving requirements without copying the earlier exchange', () => {
    const entries = [user('查看当前任务'), assistant('规格：specs/task.md；P1 src/a.ts:20，尚未验证')]
    const text = withEvidence('交接任务', null, 'handoff', entries)
    expect(text).toContain('未完成项')
    expect(text).not.toContain('specs/task.md')
    expect(text).not.toContain('P1 src/a.ts:20')
    expect(withEvidence('修复问题', null, 'review-fix', entries)).not.toContain('specs/task.md')
    expect(withEvidence('修复问题', null, 'review-fix', entries)).toContain('逐项修复全部明确问题')
    expect(withEvidence('提交', null, 'commit', entries)).toContain('分类汇总')
    expect(withEvidence('自定义', null, 'custom', entries)).toBe('自定义')
  })
  it('keeps coding entries from updating product documents and adds the supplement instruction', () => {
    for (const actionId of ['execute', 'bug', 'tdd', 'review-fix']) {
      const draft = withEvidence('任务', null, actionId)
      expect(draft).toContain('不更新产品资料文档')
      expect(draft).toContain('补充文档')
    }
    for (const actionId of ['compile', 'commit', 'review']) {
      expect(withEvidence('任务', null, actionId)).not.toContain('不更新产品资料文档')
    }
    const supplement = withEvidence('补充', null, 'doc-supplement')
    expect(supplement).toContain('增量补充')
    expect(supplement).toContain('待确认')
    expect(supplement).not.toContain('【上一阶段对话摘录')
    expect(withEvidence('Task', null, 'execute', [], true)).toContain('Do not update product documents')
  })
  it('references long reports in either language without copying or truncating them', () => {
    const entries = [user('request-marker'.repeat(200)), assistant('report-marker'.repeat(600))]
    for (const english of [false, true]) {
      const draft = withEvidence('fix', null, 'review-fix', entries, english)
      expect(draft).not.toContain('request-marker')
      expect(draft).not.toContain('report-marker')
      expect(draft).not.toContain('截断')
      expect(draft).not.toContain('truncated')
      expect(draft).toContain(english ? 'previous review report' : '上一轮审查报告')
      expect(draft).toContain(english ? 'finding IDs' : '问题编号')
      expect(draft.length).toBeLessThan(1000)
    }
  })
  it('does not use earlier evidence as the current action intent', () => {
    expect(recommend([user('帮我看别的问题\n\n【上一阶段对话摘录】\n代码审查'), assistant('审查结果：P1 src/a.ts:20')])).toBeNull()
  })
  it('routes a real repair draft by button id instead of its review keywords', () => {
    const review: ChatEntry[] = [
      user('/code-review 只审查正确性、数据安全、并发和可维护性', 1),
      assistant('代码审查报告（只读）：R-01 P1 src/a.ts:20 空指针；R-02 P2 越权访问', 2),
    ]
    const draft = withEvidence(button('review-fix').prompt, recommend(review, false, DEFAULT_ACTIONS), 'review-fix', review)
    const repaired = recommend([
      user(draft, 3),
      assistant('修复完成：R-01（P1）已修复 src/a.ts:20，R-02 已补权限校验；回归 21/21 通过', 4),
    ], false, DEFAULT_ACTIONS)
    expect(repaired?.ids).toEqual(['compile', 'review'])
    expect(repaired?.reason).toBe('reasonRepairReady')
    expect(recommend(review, false, DEFAULT_ACTIONS)?.ids).toEqual(['review-fix'])
  })
  it('keeps the repair button only when the reply still reports unresolved findings', () => {
    const report = '已修复 R-01（P1）src/a.ts:20；R-07 未修复，需要产品确认权限模型；回归 18/21 通过'
    expect(recommend([
      user(withEvidence(button('review-fix').prompt, null, 'review-fix', []), 3),
      assistant(report, 4),
    ], false, DEFAULT_ACTIONS)?.ids).toEqual(['review-fix'])
  })
  it('does not guess a stage for a button that declares no successor', () => {
    const commit = withEvidence(button('commit').prompt, null, 'commit', [])
    expect(recommend([
      user(commit, 5),
      assistant('提交完成：P1 修复已入库，diff +12/-3', 6),
    ], false, DEFAULT_ACTIONS)).toBeNull()
  })
  it('keeps keyword fallback for hand-typed requests', () => {
    expect(recommend([
      user('请代码审查', 7),
      assistant('审查结果：P1 src/a.ts:20 空指针问题', 8),
    ], false, DEFAULT_ACTIONS)?.ids).toEqual(['review-fix'])
    expect(recommend([
      user('请代码审查', 7),
      assistant('审查结果：P1 src/a.ts:20 空指针问题', 8),
    ])?.ids).toEqual(['review-fix'])
  })
})
