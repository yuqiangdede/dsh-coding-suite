import type { CodingAction } from './actions.ts';
/** Visual-only groups. One action ID may be referenced by several groups. */
export declare const LAUNCHER_GROUPS: readonly [{
    readonly id: "requirements-analysis";
    readonly label: "groupRequirementsAnalysis";
    readonly actionIds: readonly ["product-development-pipeline", "requirement-clarification", "requirement-analysis", "product-risk-gate", "solution-design", "product-module-gate", "product-state-gate", "product-exception-gate", "product-prd-pages", "product-consistency-gate", "product-image-prompt"];
}, {
    readonly id: "development";
    readonly label: "groupDevelopment";
    readonly actionIds: readonly ["discussion", "visual", "spec", "plan", "execute", "bug", "add-logs", "analyze-logs", "review", "review-fix", "compile", "health-acceptance", "commit", "doc-supplement", "remote-debug"];
}, {
    readonly id: "documents";
    readonly label: "groupDocuments";
    readonly actionIds: readonly ["api-docs", "requirements", "overview", "outline", "database", "doc-merge", "docx"];
}, {
    readonly id: "others";
    readonly label: "groupOthers";
    readonly actionIds: readonly ["initialize", "graphify-navigation", "ask", "health-acceptance", "doc-supplement", "tdd", "prototype", "architecture", "domain", "research", "retro", "handoff", "image", "prd-writing", "requirement-review"];
}];
export type OptionalGroupId = typeof LAUNCHER_GROUPS[number]['id'];
export type GroupId = 'common' | OptionalGroupId;
export declare const DEFAULT_COMMON_IDS: readonly ["bug", "add-logs", "analyze-logs", "discussion", "execute", "review", "review-fix", "compile", "commit", "continue", "remote-debug"];
export interface LauncherLayout {
    schemaVersion: 1;
    visibleGroups: Record<GroupId, boolean>;
    commonActionIds: string[];
}
export declare function defaultLauncherLayout(actions: readonly CodingAction[], hasSavedActions?: boolean): LauncherLayout;
/** Reject damaged saved layout instead of silently losing user preferences. */
export declare function parseLauncherLayout(source: string | undefined, actions: readonly CodingAction[], hasSavedActions?: boolean): LauncherLayout;
/**
 * Count how many leading buttons fit on one row. When the rest do not fit, the
 * row also has to carry a More button, so reserve its width and the gap before
 * it. Returns `widths.length` when everything fits and `0` when not even the
 * first button fits next to More.
 */
export declare function fittedActionCount(widths: readonly number[], available: number, gap: number, moreWidth?: number): number;
export declare function actionsForGroup(groupId: 'common' | OptionalGroupId, enabled: readonly CodingAction[], layout: LauncherLayout): CodingAction[];
/** Export the full layout while keeping the v3 action document importable by older clients. */
export declare function exportLauncherConfiguration(actionsDocument: string, layout: LauncherLayout): string;
export declare function importedLauncherLayout(source: string, actions: readonly CodingAction[], fallback: LauncherLayout): LauncherLayout;
//# sourceMappingURL=launcher-layout.d.ts.map