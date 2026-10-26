import { receivingInstructions, documentReceiving, codingDocPolicy } from './locales.ts'

/** Read-only recommendations derived from finalized, visible chat messages. */
export interface ChatEntry {
  /** Speaker of a finalized conversation message. */
  role: 'user' | 'assistant'
  /** Plain text extracted from the message's text blocks. */
  text: string
  /** Source sequence used to preserve message order. */
  seq: number
  /** Whether the assistant message was interrupted or ended with an error. */
  failed?: boolean
}

/**
 * Launcher button signature that attributes a request to the button that
 * inserted it, without guessing a workflow stage from prompt keywords.
 */
export interface ActionSignature {
  /** Configured button id. */
  readonly id: string
  /** Insertion kind: skills start with their slash command, prompts with their own text. */
  readonly kind: 'skill' | 'prompt'
  /** Slash command name of a skill button. */
  readonly skillId?: string
  /** Text a prompt button inserts at the front of the draft. */
  readonly prompt: string
}

/** Localized reason identifiers for advisory next-step recommendations. */
export type RecommendationReason =
  | 'reasonReviewFindings'
  | 'reasonReviewClean'
  | 'reasonRequirementsReady'
  | 'reasonSpecReady'
  | 'reasonPlanReady'
  | 'reasonImplementationReady'
  | 'reasonRepairReady'
  | 'reasonBuildReady'
  | 'reasonPreviousFailed'
  | 'reasonResearchReady'
  | 'reasonPrototypeReady'
  | 'reasonArchitectureReady'
  | 'reasonDomainReady'
  | 'reasonHandoffReady'

/** A suggested button set and the evidence used to choose it. */
export interface Recommendation {
  /** IDs of the available actions that can follow the completed step. */
  readonly ids: readonly string[]
  /** Finalized assistant text to include in a user-editable draft. */
  readonly evidence: string
  /** Locale key describing why the action is suggested. */
  readonly reason: RecommendationReason
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null
}

function textBlocks(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.map((block) => {
    const item = record(block)
    if (!item) return ''
    if ((item.kind === 'text' || item.type === 'text') && typeof item.text === 'string') return item.text
    return ''
  }).filter(Boolean).join('\n')
}

/**
 * Read the latest completed exchange, or the visible history for session gates.
 * @param view - Chat view snapshot or another registered view snapshot.
 * @param all - Include all visible user/assistant and error nodes, even an unanswered request.
 * @returns Text entries in source order, excluding tool output.
 */
export function chatEntries(view: unknown, all = false): ChatEntry[] {
  const snapshot = record(view)
  if (!snapshot) return []
  const legacy = record(snapshot.legacy)
  const candidates = [legacy?.nodes, snapshot.items, snapshot.entries, snapshot.messages]
  const values = candidates.find(Array.isArray)
  if (!Array.isArray(values)) return []
  const entries: ChatEntry[] = []
  let assistantFound = false
  let userFound = false
  for (let i = values.length - 1; i >= 0; i--) {
    const wrapper = record(values[i])
    if (!wrapper) continue
    const data = record(wrapper.data) ?? wrapper
    const node = record(data.node) ?? record(data.message) ?? data
    const kind = node.kind ?? node.role ?? wrapper.kind
    if (!all && kind === 'user' && !assistantFound) return []
    if (kind === 'turn-error' && (all || !assistantFound)) {
      entries.push({
        role: 'assistant',
        text: typeof node.message === 'string' ? node.message : '',
        seq: typeof node.seq === 'number' ? node.seq : i,
        failed: true,
      })
      assistantFound = true
    } else if (kind === 'assistant' && (all || !assistantFound)) {
      const text = typeof node.text === 'string' ? node.text : textBlocks(node.blocks)
      if (text.trim()) {
        entries.push({
          role: 'assistant',
          text,
          seq: typeof node.seq === 'number' ? node.seq : i,
          failed: node.interrupted === true,
        })
        assistantFound = true
      }
    } else if (kind === 'user' && (all || (assistantFound && !userFound))) {
      const text = typeof node.text === 'string' ? node.text : textBlocks(node.content)
      if (text.trim()) {
        entries.push({
          role: 'user',
          text,
          seq: typeof node.seq === 'number' ? node.seq : i,
        })
        userFound = true
      }
    }
    if (!all && assistantFound && userFound) break
  }
  return entries.reverse()
}

/**
 * Reconstruct the session's discussion gate from visible history, including follow-up
 * answers. No component-local latch: switching sessions or reloading cannot leak readiness.
 */
export function requirementsReady(view: unknown, running = false, actions: readonly ActionSignature[] = []): boolean {
  if (running) return false
  let discussion: ChatEntry | undefined
  let response: ChatEntry | undefined
  let turnFailed = false
  const concluded = () => discussion !== undefined && response !== undefined && !turnFailed
    && /需求(?:已确认|明确|确定)|(?:需求|讨论)(?:结果|结论)\s*[:：]|confirmed requirements/i.test(response.text)
    && !/吗[？?]|是否.{0,16}(?:确认|明确)|(?:尚无|暂无|没有|未形成|尚未形成)讨论结论|(?:尚待|仍待|尚未|未|待)确认|请(?:先)?确认|尚不明确|not (?:yet )?confirmed|的意思|翻译|translation/i.test(response.text)
    && recommend([discussion, response], false, actions)?.reason === 'reasonRequirementsReady'
  for (const entry of chatEntries(view, true)) {
    if (entry.role === 'user') {
      // Accept a conclusion only after all assistant/error nodes in its turn are known.
      if (concluded()) return true
      response = undefined
      turnFailed = false
      const request = (entry.text.split('\n\n【')[0] ?? entry.text).trim()
      const intent = actionIntent(request, actions)
      const stage = links.find(link => intent === null ? link.trigger.test(request) : link.actionIds?.includes(intent))
      if (stage?.reason === 'reasonRequirementsReady') {
        discussion = entry
      } else if (intent !== null || (stage !== undefined && /^(?:请|帮我|开始|执行|进行)/.test(request)) || /^\/[a-z][a-z-]*(?=\s|$)/.test(request)
        || /翻译|translate|另一个问题|换个话题/i.test(request)) {
        discussion = undefined
      }
    } else {
      response = entry
      turnFailed ||= entry.failed === true
    }
  }
  return concluded()
}

/** Defect evidence naming a severity or a file/line beside the problem. */
const findingEvidence = String.raw`\bP[0-3]\b|(?:问题|缺陷|错误|finding|defect|issue|error).{0,40}(?:\.tsx?|\.js|\.py|:\d+)`

/**
 * Stage links in priority order. A button-inserted request is routed to its own
 * step by action id; a hand-typed request still matches at most one step by its
 * trigger keywords.
 */
const links: readonly {
  trigger: RegExp
  /** Buttons that own this step; id routing takes precedence over trigger keywords. */
  actionIds?: readonly string[]
  success: RegExp
  ids: readonly string[]
  reason: RecommendationReason
  /** Actions kept when the matched reply confirms nothing and the turn failed. */
  failureIds?: readonly string[]
}[] = [
  {
    trigger: /代码审查|代码走读|代码评审|走读|code.review|\breview\b/i,
    actionIds: ['review'],
    success: new RegExp(String.raw`(?:审查|走读|评审|检视)(?:完成|结果|结论|发现|报告)|review (?:complete|findings|result)|${findingEvidence}`, 'i'),
    ids: ['review-fix'],
    reason: 'reasonReviewFindings',
    failureIds: ['review-fix', 'bug'],
  },
  { trigger: /需求讨论|可视化讨论|grill.with/i, actionIds: ['discussion', 'visual'], success: /需求(已确认|结论|明确|确定)|讨论(结果|结论)|confirmed requirements/i, ids: ['spec'], reason: 'reasonRequirementsReady' },
  { trigger: /固化需求|to.spec/i, actionIds: ['spec'], success: /规格(已|文档|完成)|验收(标准|条件)|specification complete/i, ids: ['plan'], reason: 'reasonSpecReady' },
  { trigger: /拆分工单|to-tickets|制定计划|writing.plans/i, actionIds: ['plan'], success: /工单|计划(已|完成|任务|步骤)|implementation plan|tickets? (created|ready)/i, ids: ['execute'], reason: 'reasonPlanReady' },
  { trigger: /执行开发|\/implement\b|^开发|executing.plans/i, actionIds: ['execute', 'tdd'], success: /实现(完成|完毕)|开发(完成|结束)|implementation completed/i, ids: ['compile', 'review'], reason: 'reasonImplementationReady' },
  { trigger: /修复|Bug 排查|diagnosing.bugs/i, actionIds: ['review-fix', 'bug'], success: /修复(?:完成|成功|已)|已(?:修复|解决)|问题(?:已解决|已修复)|fixed and verified/i, ids: ['compile', 'review'], reason: 'reasonRepairReady', failureIds: ['review-fix', 'bug'] },
  { trigger: /编译|构建|build/i, actionIds: ['compile'], success: /编译(成功|通过)|构建(成功|通过)|build (passed|succeeded)|0 errors/i, ids: ['commit'], reason: 'reasonBuildReady' },
  { trigger: /\/research\b|资料研究/i, actionIds: ['research'], success: /研究(完成|结论)|research (complete|findings)|资料来源/i, ids: ['discussion'], reason: 'reasonResearchReady' },
  { trigger: /\/prototype\b|制作原型/i, actionIds: ['prototype'], success: /原型(完成|结论)|prototype (complete|ready)|验证结论/i, ids: ['discussion'], reason: 'reasonPrototypeReady' },
  { trigger: /improve-codebase-architecture|架构优化/i, actionIds: ['architecture'], success: /候选方案|优化建议|architectur.*(candidates|recommendations)/i, ids: ['discussion'], reason: 'reasonArchitectureReady' },
  { trigger: /domain-modeling|领域建模/i, actionIds: ['domain'], success: /术语(已|表)|建模完成|glossary.*(updated|complete)/i, ids: ['discussion'], reason: 'reasonDomainReady' },
  { trigger: /\/handoff\b|上下文交接/i, actionIds: ['handoff'], success: /交接文档|handoff.*\.md/i, ids: ['continue'], reason: 'reasonHandoffReady' },
]
/** Match explicit task outcomes, not pending follow-ups or scenarios mentioned in a completion report. */
const failures = /(?:请求|任务|执行|操作|回合|扫描|走读|审查)(?:过程|进行到一半)?(?:被|已|意外)?中断|无法继续|(?:实现|开发|修复|任务)(?:尚|仍|还)?未完成|(?:测试|构建|编译)失败|tests? failed|build failed/i
const negative = /没有(发现|检测到).{0,12}(问题|缺陷)|未发现.{0,12}(问题|缺陷)|no (issues|findings|defects)/i
const positiveFinding = new RegExp(findingEvidence, 'i')
/** Repair replies that still carry open findings; only these may send the work back to repair. */
const unresolved = /(?:仍有|还有|剩余|未修复|未处理|待修复|未解决|部分修复)|remaining (?:issues|findings)|still (?:open|failing|unfixed)/i

/**
 * Attribute a request to the button that inserted it.
 * @param text - Request text before any inserted context excerpt.
 * @param actions - Enabled launcher buttons.
 * @returns The matching button id, or `null` for hand-typed requests.
 */
export function actionIntent(text: string, actions: readonly ActionSignature[]): string | null {
  const value = text.trimStart()
  let match: ActionSignature | null = null
  let width = 0
  for (const action of actions) {
    const prefix = action.kind === 'skill' ? (action.skillId ? '/' + action.skillId : '') : action.prompt
    if (!prefix || prefix.length <= width || !value.startsWith(prefix)) continue
    match = action
    width = prefix.length
  }
  return match?.id ?? null
}

/**
 * Recommend the next enabled workflow step from the latest completed exchange.
 * @param entries - Finalized user and assistant messages in sequence order.
 * @param running - Whether the addressed Session is still running.
 * @param actions - Enabled launcher buttons used to attribute a request without keyword guessing.
 * @returns An advisory recommendation, or `null` when the latest exchange is not actionable.
 */
export function recommend(
  entries: readonly ChatEntry[],
  running = false,
  actions: readonly ActionSignature[] = [],
): Recommendation | null {
  if (running || entries.length < 2) return null
  const assistant = entries[entries.length - 1]
  const user = entries[entries.length - 2]
  if (assistant?.role !== 'assistant' || user?.role !== 'user' || !assistant.text.trim()) return null
  const response = assistant.text
  // 已插入的交接摘录不是当前按钮意图，不能再次参与阶段匹配。
  const requestText = user.text.split('\n\n【')[0] ?? user.text
  const request = /^\/[a-z][a-z-]*(?=\s|$)/.exec(requestText)?.[0] ?? requestText
  // 按钮插入的请求按自身签名归位；只有手打文本才回落到关键词表。
  const intent = actionIntent(requestText, actions)
  const failed = assistant.failed === true || failures.test(response)
  for (const link of links) {
    if (intent === null ? !link.trigger.test(request) : link.actionIds?.includes(intent) !== true) continue
    if (link.reason === 'reasonRepairReady' && !failed && unresolved.test(response))
      return { ids: ['review-fix'], evidence: response.slice(0, 5000), reason: 'reasonReviewFindings' }
    if (!link.success.test(response)) {
      if (failed && link.failureIds) return { ids: link.failureIds, evidence: response.slice(0, 5000), reason: 'reasonPreviousFailed' }
      continue
    }
    if (link.reason === 'reasonReviewFindings' && negative.test(response) && !positiveFinding.test(response)) {
      if (failed) break
      return { ids: ['commit'], evidence: response.slice(0, 5000), reason: 'reasonReviewClean' }
    }
    if (failed && link.reason !== 'reasonReviewFindings') break
    return { ids: link.ids, evidence: response.slice(0, 5000), reason: link.reason }
  }
  if (failed) return { ids: ['bug', 'continue'], evidence: response.slice(0, 5000), reason: 'reasonPreviousFailed' }
  return null
}

/**
 * Add action-specific receiving instructions to an editable draft.
 * Reference the original conversation instead of copying or truncating earlier messages.
 * @param prompt - Configured action prompt.
 * @param _recommendation - Reserved for call compatibility; report content is not copied.
 * @param actionId - Action being inserted.
 * @param _entries - Reserved for call compatibility; conversation content is not copied.
 * @param english - Whether the receiving instructions use English.
 * @returns A draft carrying the action's receiving task without conversation excerpts.
 */
export function withEvidence(
  prompt: string,
  _recommendation: Recommendation | null,
  actionId: string,
  _entries: readonly ChatEntry[] = [],
  english = false,
): string {
  const instruction = receivingInstructions[actionId] ?? (documentActions.has(actionId) ? documentReceiving : undefined)
  if (!instruction) return prompt
  const policy = codeActions.has(actionId) ? codingDocPolicy[english ? 1 : 0] : ''
  return prompt + '\n\n' + instruction[english ? 1 : 0] + (policy ? '\n' + policy : '')
}

const documentActions = new Set(['api-docs', 'requirements', 'overview', 'outline', 'database', 'doc-merge', 'docx'])
const codeActions = new Set(['execute', 'bug', 'tdd', 'review-fix'])
