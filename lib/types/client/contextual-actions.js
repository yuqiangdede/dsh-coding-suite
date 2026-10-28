import { receivingInstructions, documentReceiving, codingDocPolicy } from "./locales.js";
function record(value) {
    return value !== null && typeof value === 'object' ? value : null;
}
function textBlocks(value) {
    if (!Array.isArray(value))
        return '';
    return value.map((block) => {
        const item = record(block);
        if (!item)
            return '';
        if ((item.kind === 'text' || item.type === 'text') && typeof item.text === 'string')
            return item.text;
        return '';
    }).filter(Boolean).join('\n');
}
/**
 * Read at most the latest completed user/assistant exchange from a Chat view.
 * @param view - Chat view snapshot or another registered view snapshot.
 * @returns The latest text exchange in sequence order, excluding tool output.
 */
export function chatEntries(view) {
    const snapshot = record(view);
    if (!snapshot)
        return [];
    const legacy = record(snapshot.legacy);
    const candidates = [legacy?.nodes, snapshot.items, snapshot.entries, snapshot.messages];
    const values = candidates.find(Array.isArray);
    if (!Array.isArray(values))
        return [];
    const entries = [];
    let assistantFound = false;
    let userFound = false;
    for (let i = values.length - 1; i >= 0; i--) {
        const wrapper = record(values[i]);
        if (!wrapper)
            continue;
        const data = record(wrapper.data) ?? wrapper;
        const node = record(data.node) ?? record(data.message) ?? data;
        const kind = node.kind ?? node.role ?? wrapper.kind;
        if (kind === 'user' && !assistantFound)
            return [];
        if (kind === 'turn-error' && !assistantFound) {
            entries.push({
                role: 'assistant',
                text: typeof node.message === 'string' ? node.message : '',
                seq: typeof node.seq === 'number' ? node.seq : i,
                failed: true,
            });
            assistantFound = true;
        }
        else if (kind === 'assistant' && !assistantFound) {
            const text = typeof node.text === 'string' ? node.text : textBlocks(node.blocks);
            if (text.trim()) {
                entries.push({
                    role: 'assistant',
                    text,
                    seq: typeof node.seq === 'number' ? node.seq : i,
                    failed: node.interrupted === true,
                });
                assistantFound = true;
            }
        }
        else if (kind === 'user' && assistantFound && !userFound) {
            const text = typeof node.text === 'string' ? node.text : textBlocks(node.content);
            if (text.trim()) {
                entries.push({
                    role: 'user',
                    text,
                    seq: typeof node.seq === 'number' ? node.seq : i,
                });
                userFound = true;
            }
        }
        if (assistantFound && userFound)
            break;
    }
    return entries.reverse();
}
/** User messages available in the chat view, in display order. */
export function conversationHistory(view, actions) {
    const snapshot = record(view);
    if (!snapshot)
        return [];
    const legacy = record(snapshot.legacy);
    const values = [legacy?.nodes, snapshot.items, snapshot.entries, snapshot.messages].find(Array.isArray);
    if (!Array.isArray(values))
        return [];
    const result = [];
    for (const value of values) {
        const wrapper = record(value);
        if (!wrapper)
            continue;
        const data = record(wrapper.data) ?? wrapper;
        const node = record(data.node) ?? record(data.message) ?? data;
        if ((node.kind ?? node.role ?? wrapper.kind) !== 'user')
            continue;
        const text = typeof node.text === 'string' ? node.text : textBlocks(node.content);
        if (!text.trim())
            continue;
        // A manually typed slash command alone cannot establish which button was used.
        const matches = actions.filter(action => {
            if (!action.prompt)
                return false;
            if (action.kind === 'skill') {
                return Boolean(action.skillId) && text.trimStart().startsWith('/' + action.skillId + ' ' + action.prompt);
            }
            return text.includes(action.prompt);
        });
        const id = matches.length === 1 ? matches[0].id : null;
        const command = !id ? /^\/([a-z][a-z0-9-]*)(?=\s|$)/i.exec(text.trimStart())?.[1] : undefined;
        result.push({ id, command });
    }
    return result;
}
/** Defect evidence naming a severity or a file/line beside the problem. */
const findingEvidence = String.raw `\bP[0-3]\b|(?:问题|缺陷|错误|finding|defect|issue|error).{0,40}(?:\.tsx?|\.js|\.py|:\d+)`;
/**
 * Stage links in priority order. A button-inserted request is routed to its own
 * step by action id; a hand-typed request still matches at most one step by its
 * trigger keywords.
 */
const links = [
    {
        trigger: /代码审查|代码走读|代码评审|走读|code.review|\breview\b/i,
        actionIds: ['review'],
        success: new RegExp(String.raw `(?:审查|走读|评审|检视)(?:完成|结果|结论|发现|报告)|review (?:complete|findings|result)|${findingEvidence}`, 'i'),
        ids: ['review-fix'],
        reason: 'reasonReviewFindings',
        failureIds: ['review-fix', 'bug'],
    },
    { trigger: /需求讨论|可视化讨论|grill.with/i, actionIds: ['discussion', 'visual'], success: /需求(已确认|结论|明确|确定)|讨论(结果|结论)|confirmed requirements/i, ids: ['spec'], reason: 'reasonRequirementsReady' },
    { trigger: /固化需求|to.spec/i, actionIds: ['spec'], success: /规格(已|文档|完成)|验收(标准|条件)|specification complete/i, ids: ['plan'], reason: 'reasonSpecReady' },
    { trigger: /拆分工单|to-tickets|制定计划|writing.plans/i, actionIds: ['plan'], success: /工单|计划(已|完成|任务|步骤)|implementation plan|tickets? (created|ready)/i, ids: ['execute'], reason: 'reasonPlanReady' },
    { trigger: /执行开发|\/implement\b|^开发|executing.plans/i, actionIds: ['execute', 'tdd'], success: /实现(完成|完毕)|开发(完成|结束)|已完成(?:实现|开发)|implementation completed/i, ids: ['compile', 'review'], reason: 'reasonImplementationReady' },
    { trigger: /修复|Bug 排查|diagnosing.bugs/i, actionIds: ['review-fix', 'bug'], success: /修复(?:完成|成功|已)|已(?:修复|解决)|问题(?:已解决|已修复)|fixed and verified/i, ids: ['compile', 'review'], reason: 'reasonRepairReady', failureIds: ['review-fix', 'bug'] },
    { trigger: /编译|构建|build/i, actionIds: ['compile'], success: /编译(成功|通过)|构建(成功|通过)|build (passed|succeeded)|0 errors/i, ids: ['commit'], reason: 'reasonBuildReady' },
    { trigger: /\/research\b|资料研究/i, actionIds: ['research'], success: /研究(完成|结论)|research (complete|findings)|资料来源/i, ids: ['discussion'], reason: 'reasonResearchReady' },
    { trigger: /\/prototype\b|制作原型/i, actionIds: ['prototype'], success: /原型(完成|结论)|prototype (complete|ready)|验证结论/i, ids: ['discussion'], reason: 'reasonPrototypeReady' },
    { trigger: /improve-codebase-architecture|架构优化/i, actionIds: ['architecture'], success: /候选方案|优化建议|architectur.*(candidates|recommendations)/i, ids: ['discussion'], reason: 'reasonArchitectureReady' },
    { trigger: /domain-modeling|领域建模/i, actionIds: ['domain'], success: /术语(已|表)|建模完成|glossary.*(updated|complete)/i, ids: ['discussion'], reason: 'reasonDomainReady' },
    { trigger: /\/handoff\b|上下文交接/i, actionIds: ['handoff'], success: /交接文档|handoff.*\.md/i, ids: ['continue'], reason: 'reasonHandoffReady' },
];
/** Match explicit task outcomes, not pending follow-ups or scenarios mentioned in a completion report. */
const failures = /(?:请求|任务|执行|操作|回合|扫描|走读|审查)(?:过程|进行到一半)?(?:被|已|意外)?中断|无法继续|(?:实现|开发|修复|任务)(?:尚|仍|还)?未完成|(?:测试|构建|编译)失败|tests? failed|build failed/i;
const negative = /没有(发现|检测到).{0,12}(问题|缺陷)|未发现.{0,12}(问题|缺陷)|no (issues|findings|defects)/i;
const positiveFinding = new RegExp(findingEvidence, 'i');
/** Repair replies that still carry open findings; only these may send the work back to repair. */
const unresolved = /(?:仍有|还有|剩余|未修复|未处理|待修复|未解决|部分修复)|remaining (?:issues|findings)|still (?:open|failing|unfixed)/i;
/** Ignore report labels and explicit empty lists, while retaining actual open findings. */
function hasUnresolvedFindings(response) {
    const findings = response
        .replace(/(?:以下|下面)(?:是|为)[^。\n：:]*未修复项[。\n]/g, '')
        .replace(/(?:无|没有|不存在)(?:任何)?(?:未修复|未处理|待修复|未解决|剩余)(?:项|问题|缺陷)?/g, '')
        .replace(/(?:未修复|未处理|待修复|未解决|剩余)(?:项|问题|缺陷)[：:]\s*(?:无|没有|0(?!\d)|none\b)/gi, '')
        .replace(/^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:[一二三四五六七八九十\d]+[、.．]\s*)?(?:未修复|未处理|待修复|未解决|剩余)(?:项|问题|缺陷)(?:\*\*)?[：:]?\s*$/gm, '');
    return unresolved.test(findings);
}
/**
 * Attribute a request to the button that inserted it.
 * @param text - Request text before any inserted context excerpt.
 * @param actions - Enabled launcher buttons.
 * @returns The matching button id, or `null` for hand-typed requests.
 */
export function actionIntent(text, actions) {
    const value = text.trimStart();
    let match = null;
    let width = 0;
    for (const action of actions) {
        const prefix = action.kind === 'skill' ? (action.skillId ? '/' + action.skillId : '') : action.prompt;
        if (!prefix || prefix.length <= width || !value.startsWith(prefix))
            continue;
        if (action.kind === 'skill' && value.length > prefix.length && !/\s/.test(value[prefix.length]))
            continue;
        match = action;
        width = prefix.length;
    }
    return match?.id ?? null;
}
/** Product outcomes are explicit advisory markers, never inferred from GO/S0 mentions in prose. */
const productSteps = {
    'requirement-clarification': { READY_FOR_ANALYSIS: 'requirement-analysis' },
    'requirement-analysis': { READY_FOR_SOLUTION: 'product-risk-gate', BACK_TO_CLARIFICATION: 'requirement-clarification' },
    'solution-design': { READY_FOR_PRD: 'product-module-gate' },
    'prd-writing': { READY_FOR_REVIEW: 'requirement-review', BACK_TO_SOLUTION: 'solution-design' },
    'product-prd-pages': { READY_FOR_CONSISTENCY: 'product-consistency-gate' },
    'product-image-prompt': {},
};
const productGates = {
    'product-risk-gate': 'solution-design',
    'product-module-gate': 'product-state-gate',
    'product-state-gate': 'product-exception-gate',
    'product-exception-gate': 'product-prd-pages',
    'product-consistency-gate': 'product-image-prompt',
};
function productRecommendation(id, response) {
    const evidence = response.slice(0, 5000);
    if (id === 'product-development-pipeline')
        return null;
    let fence;
    const lines = response.split(/\r?\n/).flatMap(line => {
        const trimmed = line.trim();
        const delimiter = /^(\x60{3,}|~{3,})/.exec(trimmed)?.[1];
        if (delimiter) {
            if (!fence)
                fence = delimiter;
            else if (delimiter[0] === fence[0] && delimiter.length >= fence.length)
                fence = undefined;
            return [];
        }
        return fence ? [] : [trimmed.replace(/^(?:#{1,6}\s+|[-*]\s+)/, '').replace(/\*\*|`/g, '')];
    });
    // Keep all declared values so conflicting, unknown or negated outcomes cannot be ignored.
    const values = (pattern) => [...new Set(lines.flatMap(line => {
            const match = pattern.exec(line);
            return match ? [match[1].trim()] : [];
        }))];
    const targets = values(/^(?:回退阶段|Return stage)\s*[:：]\s*(.+)$/i);
    const returnStage = () => targets.length === 1 &&
        (Object.hasOwn(productSteps, targets[0]) || Object.hasOwn(productGates, targets[0])) && targets[0] !== 'product-image-prompt'
        ? { ids: [targets[0]], evidence, reason: 'reasonRequirementsRevision' } : null;
    const gates = values(/^(?:阶段\s*Gate|Stage gate)\s*[:：]\s*(.+)$/i);
    if (gates.length > 0) {
        if (gates.length !== 1)
            return null;
        if (gates[0] !== 'PASS')
            return ['FAIL', 'CONDITIONAL PASS'].includes(gates[0]) ? returnStage() : null;
        if (targets.length > 0)
            return null;
    }
    if (Object.hasOwn(productGates, id))
        return gates[0] === 'PASS'
            ? { ids: [productGates[id]], evidence, reason: 'reasonProductStageReady' } : null;
    if (id === 'requirement-review') {
        const outcomes = values(/^(?:需求评审结论|Requirements review outcome)\s*[:：]\s*(.+)$/i);
        if (outcomes.length !== 1)
            return null;
        if (outcomes[0] === 'GO')
            return targets.length === 0
                ? { ids: ['product-prd-pages'], evidence, reason: 'reasonProductStageReady' } : null;
        if (!['NO-GO', 'CONDITIONAL GO'].includes(outcomes[0]))
            return null;
        return returnStage();
    }
    const outcomes = values(/^(?:阶段结论|Stage outcome)\s*[:：]\s*(.+)$/i);
    const outcomesForStep = productSteps[id];
    const next = outcomes.length === 1 && outcomesForStep && Object.hasOwn(outcomesForStep, outcomes[0])
        ? outcomesForStep[outcomes[0]] : undefined;
    return next ? { ids: [next], evidence, reason: 'reasonProductStageReady' } : null;
}
/**
 * Recommend the next enabled workflow step from the latest completed exchange.
 * @param entries - Finalized user and assistant messages in sequence order.
 * @param running - Whether the addressed Session is still running.
 * @param actions - Enabled launcher buttons used to attribute a request without keyword guessing.
 * @returns An advisory recommendation, or `null` when the latest exchange is not actionable.
 */
export function recommend(entries, running = false, actions = []) {
    if (running || entries.length < 2)
        return null;
    const assistant = entries[entries.length - 1];
    const user = entries[entries.length - 2];
    if (assistant?.role !== 'assistant' || user?.role !== 'user' || !assistant.text.trim())
        return null;
    const response = assistant.text;
    // 已插入的交接摘录不是当前按钮意图，不能再次参与阶段匹配。
    const requestText = user.text.split('\n\n【')[0] ?? user.text;
    const request = /^\/[a-z][a-z-]*(?=\s|$)/.exec(requestText)?.[0] ?? requestText;
    // 按钮插入的请求按自身签名归位；只有手打文本才回落到关键词表。
    const intent = actionIntent(requestText, actions);
    // Saved/custom repair prompts may differ from today's signature and mention reviews.
    const repairRequest = intent === null && !request.startsWith('/')
        && /^(?:请)?(?:只|仅)?修复|(?:请根据|请按|请逐项|逐项)[^。\n]*修复/.test(request);
    // Negated outcomes are evidence of success, not failures of this turn.
    const outcomeText = response.replace(/(?:未出现|没有出现|未发生|没有发生|未发现|没有|并无|不存在|无)(?:任何)?(?:测试|构建|编译)失败|\bno (?:tests? failed|build failed)\b/gi, '');
    const failed = assistant.failed === true || failures.test(outcomeText);
    const productId = intent ?? /^\/([a-z][a-z-]*)(?=\s|$)/.exec(requestText)?.[1];
    if (productId && (Object.hasOwn(productSteps, productId) || Object.hasOwn(productGates, productId) || productId === 'requirement-review' || productId === 'product-development-pipeline'))
        return failed ? null : productRecommendation(productId, response);
    for (const link of links) {
        if (repairRequest && link.reason !== 'reasonRepairReady')
            continue;
        if (intent === null ? !link.trigger.test(request) : link.actionIds?.includes(intent) !== true)
            continue;
        if (link.reason === 'reasonRepairReady' && !failed && hasUnresolvedFindings(response))
            return { ids: ['review-fix'], evidence: response.slice(0, 5000), reason: 'reasonReviewFindings' };
        if (!link.success.test(response)) {
            if (failed && link.failureIds)
                return { ids: link.failureIds, evidence: response.slice(0, 5000), reason: 'reasonPreviousFailed' };
            continue;
        }
        if (link.reason === 'reasonReviewFindings' && negative.test(response) && !positiveFinding.test(response)) {
            if (failed)
                break;
            return { ids: ['commit'], evidence: response.slice(0, 5000), reason: 'reasonReviewClean' };
        }
        if (failed && link.reason !== 'reasonReviewFindings')
            break;
        return { ids: link.ids, evidence: response.slice(0, 5000), reason: link.reason };
    }
    if (failed)
        return { ids: ['bug', 'continue'], evidence: response.slice(0, 5000), reason: 'reasonPreviousFailed' };
    return null;
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
export function withEvidence(prompt, _recommendation, actionId, _entries = [], english = false) {
    const instruction = receivingInstructions[actionId] ?? (documentActions.has(actionId) ? documentReceiving : undefined);
    if (!instruction)
        return prompt;
    const policy = codeActions.has(actionId) ? codingDocPolicy[english ? 1 : 0] : '';
    return prompt + '\n\n' + instruction[english ? 1 : 0] + (policy ? '\n' + policy : '');
}
const documentActions = new Set(['api-docs', 'requirements', 'overview', 'outline', 'database', 'doc-merge', 'docx']);
const codeActions = new Set(['execute', 'bug', 'tdd', 'review-fix']);
//# sourceMappingURL=contextual-actions.js.map