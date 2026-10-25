import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import css from './Launcher.module.css';
/** Localized name of one stage status. */
const STAGE_LABEL = {
    pending: 'workflowStagePending',
    running: 'workflowStageRunning',
    waiting_approval: 'workflowStageWaitingApproval',
    completed: 'workflowStageCompleted',
    failed: 'workflowStageFailed',
    blocked: 'workflowStageBlocked',
    skipped: 'workflowStageSkipped',
    stale: 'workflowStageStale',
};
/** Tasks whose panel still accepts a decision or a pause/resume/cancel command. */
const OPEN_STATUSES = new Set(['ready', 'paused', 'blocked', 'waiting_approval']);
/** Minimum decision text the Host accepts for an approval or a cancellation. */
export const MIN_DECISION_LENGTH = 8;
/**
 * Render one task's progress and commands.
 * @param props - record, draft, pending flag, callbacks, and locale lookup.
 * @returns the panel element.
 */
export function WorkflowPanel({ item, decision, pending, onDecision, onAction, t }) {
    const stages = Object.keys(item.stages)
        .sort((left, right) => Number(left.slice(1)) - Number(right.slice(1)));
    const decisionReady = decision.trim().length >= MIN_DECISION_LENGTH;
    return _jsxs("div", { className: css.workflowPanel, "data-coding-workflow": true, children: [_jsxs("div", { className: css.workflowHead, children: [_jsxs("span", { className: css.workflowTitle, children: [t('workflowTask'), " ", item.taskId.slice(0, 8)] }), _jsxs("span", { className: css.workflowMeta, children: [t('workflowModeLabel'), " ", item.mode, " \u00B7 ", t('workflowBranchLabel'), " ", item.branch] })] }), _jsx("div", { className: css.stageRow, role: "group", "aria-label": t('workflowStages'), children: stages.map((stage) => {
                    const status = item.stages[stage].status;
                    const state = status === 'completed' ? css.stageDone
                        : status === 'failed' || status === 'blocked' ? css.stageBlocked
                            : status === 'stale' ? css.stageStale
                                : status === 'skipped' ? css.stageSkipped : css.stagePending;
                    return _jsx("span", { className: `${css.stageChip} ${state}`, title: t(STAGE_LABEL[status] ?? 'workflowStagePending'), children: stage }, stage);
                }) }), item.blocker !== null && _jsxs("div", { className: css.workflowBlocker, role: "status", children: [item.blocker.stage, " \u00B7 ", item.blocker.reason] }), _jsxs("div", { className: css.workflowActions, children: [item.status === 'waiting_approval' && _jsxs(_Fragment, { children: [_jsx("input", { className: css.workflowInput, value: decision, onChange: (event) => { onDecision(event.target.value); }, placeholder: t('workflowDecision'), "aria-label": t('workflowDecision'), disabled: pending }), _jsx("button", { type: "button", className: css.action, disabled: pending || !decisionReady, onClick: () => { onAction('approve'); }, children: t('workflowApprove') })] }), OPEN_STATUSES.has(item.status) && item.status !== 'waiting_approval' &&
                        _jsx("input", { className: css.workflowInput, value: decision, onChange: (event) => { onDecision(event.target.value); }, placeholder: t('workflowCancelReason'), "aria-label": t('workflowCancelReason'), disabled: pending }), item.status === 'ready' && _jsx("button", { type: "button", className: css.action, disabled: pending, onClick: () => { onAction('pause'); }, children: t('workflowPause') }), (item.status === 'paused' || item.status === 'blocked') &&
                        _jsx("button", { type: "button", className: css.action, disabled: pending, onClick: () => { onAction('resume'); }, children: t('workflowResume') }), OPEN_STATUSES.has(item.status) && _jsx("button", { type: "button", className: css.action, disabled: pending || !decisionReady, onClick: () => { onAction('cancel'); }, children: t('workflowCancel') })] })] });
}
//# sourceMappingURL=WorkflowPanel.js.map