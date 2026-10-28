/** Visual-only groups. One action ID may be referenced by several groups. */
export const LAUNCHER_GROUPS = [
    { id: 'requirements-analysis', label: 'groupRequirementsAnalysis', actionIds: ['product-development-pipeline', 'requirement-clarification', 'requirement-analysis', 'product-risk-gate', 'solution-design', 'product-module-gate', 'product-state-gate', 'product-exception-gate', 'product-prd-pages', 'product-consistency-gate', 'product-image-prompt'] },
    { id: 'development', label: 'groupDevelopment', actionIds: ['discussion', 'visual', 'spec', 'plan', 'execute', 'bug', 'add-logs', 'analyze-logs', 'review', 'review-fix', 'compile', 'health-acceptance', 'commit', 'doc-supplement', 'remote-debug'] },
    { id: 'documents', label: 'groupDocuments', actionIds: ['api-docs', 'requirements', 'overview', 'outline', 'database', 'doc-merge', 'docx'] },
    { id: 'others', label: 'groupOthers', actionIds: ['initialize', 'graphify-navigation', 'graphify-refresh', 'ask', 'health-acceptance', 'doc-supplement', 'tdd', 'prototype', 'architecture', 'domain', 'research', 'retro', 'handoff', 'image', 'prd-writing', 'requirement-review'] },
];
export const DEFAULT_COMMON_IDS = ['bug', 'add-logs', 'analyze-logs', 'discussion', 'execute', 'review', 'review-fix', 'compile', 'commit', 'continue', 'remote-debug'];
const LEGACY_DEFAULT_PINNED = ['discussion', 'spec', 'execute', 'bug', 'review', 'health-acceptance', 'doc-supplement', 'commit', 'review-fix', 'compile'];
const defaultVisibility = {
    common: true, 'requirements-analysis': true, development: true, documents: false, others: false,
};
const actionIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
export function defaultLauncherLayout(actions, hasSavedActions = false) {
    const pinned = actions.filter(a => a.pinned).map(a => a.id);
    const presetPinned = pinned.filter(id => !['add-logs', 'analyze-logs', 'remote-debug'].includes(id));
    const legacyDefaults = presetPinned.length === LEGACY_DEFAULT_PINNED.length &&
        LEGACY_DEFAULT_PINNED.every(id => presetPinned.includes(id));
    // Preserve explicitly customized old pinned lists, except the original preset.
    const commonActionIds = hasSavedActions && !legacyDefaults
        ? pinned
        : [...DEFAULT_COMMON_IDS];
    return { schemaVersion: 1, visibleGroups: { ...defaultVisibility }, commonActionIds };
}
/** Reject damaged saved layout instead of silently losing user preferences. */
export function parseLauncherLayout(source, actions, hasSavedActions = false) {
    if (!source)
        return defaultLauncherLayout(actions, hasSavedActions);
    let parsed;
    try {
        parsed = JSON.parse(source);
    }
    catch {
        throw new Error('分组布局 JSON 格式错误');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('分组布局结构错误');
    const doc = parsed;
    const visible = doc.visibleGroups;
    const ids = doc.commonActionIds;
    if (doc.schemaVersion !== 1 || !visible || typeof visible !== 'object' || Array.isArray(visible) ||
        !Array.isArray(ids) || ids.length > 100)
        throw new Error('分组布局版本或字段错误');
    const obj = visible;
    if ((obj.common !== undefined && typeof obj.common !== 'boolean') ||
        (obj['requirements-analysis'] !== undefined && typeof obj['requirements-analysis'] !== 'boolean') ||
        LAUNCHER_GROUPS.some(group => group.id !== 'requirements-analysis' && typeof obj[group.id] !== 'boolean') ||
        ids.some(id => typeof id !== 'string' || !actionIdPattern.test(id)) ||
        new Set(ids).size !== ids.length)
        throw new Error('分组布局选项或按钮 ID 错误');
    return {
        schemaVersion: 1,
        visibleGroups: {
            common: obj.common === undefined ? true : obj.common,
            'requirements-analysis': obj['requirements-analysis'] === undefined ? false : obj['requirements-analysis'],
            development: obj.development,
            documents: obj.documents,
            others: obj.others,
        },
        commonActionIds: ids,
    };
}
/**
 * Count how many leading buttons fit on one row. When the rest do not fit, the
 * row also has to carry a More button, so reserve its width and the gap before
 * it. Returns `widths.length` when everything fits and `0` when not even the
 * first button fits next to More.
 */
export function fittedActionCount(widths, available, gap, moreWidth = 0) {
    if (widths.length === 0)
        return 0;
    const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
    if (total <= available)
        return widths.length;
    let used = 0;
    for (let index = 0; index < widths.length; index++) {
        const next = used + (index > 0 ? gap : 0) + widths[index];
        if (next + gap + moreWidth > available)
            return index;
        used = next;
    }
    return widths.length;
}
export function actionsForGroup(groupId, enabled, layout) {
    const available = new Map(enabled.filter(a => a.enabled).map(a => [a.id, a]));
    const ids = groupId === 'common'
        ? layout.commonActionIds
        : LAUNCHER_GROUPS.find(group => group.id === groupId)?.actionIds ?? [];
    const ordered = ids.flatMap(id => {
        const action = available.get(id);
        return action ? [action] : [];
    });
    if (groupId !== 'others')
        return ordered;
    // Never strand custom/legacy actions after replacing the old More drawer.
    const known = new Set([
        ...DEFAULT_COMMON_IDS,
        ...LAUNCHER_GROUPS.flatMap(group => [...group.actionIds]),
    ]);
    return [...ordered, ...enabled.filter(a => a.enabled && !known.has(a.id))
            .sort((a, b) => a.order - b.order)];
}
/** Export the full layout while keeping the v3 action document importable by older clients. */
export function exportLauncherConfiguration(actionsDocument, layout) {
    const doc = JSON.parse(actionsDocument);
    return JSON.stringify({ ...doc, launcherLayout: layout }, null, 2);
}
export function importedLauncherLayout(source, actions, fallback) {
    const doc = JSON.parse(source);
    return doc && doc.launcherLayout !== undefined
        ? parseLauncherLayout(JSON.stringify(doc.launcherLayout), actions, true)
        : fallback;
}
//# sourceMappingURL=launcher-layout.js.map