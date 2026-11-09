/** Portable CodingAction domain independent of the underlying Agent engine. */
export interface CodingAction {
    id: string;
    label: string;
    kind: 'skill' | 'prompt';
    skillId?: string;
    prompt: string;
    enabled: boolean;
    /** Show this button directly in the launcher; every other enabled button sits under More. */
    pinned?: boolean;
    order: number;
    description: string;
    example: string;
}
/** Stable ID preserves saved group membership when replacing the logging shortcut. */
export declare const DIAGNOSTIC_MODES: readonly [{
    readonly skillId: "diagnose-function-page";
    readonly label: "功能排查-页面模式";
    readonly english: "Function diagnostics · Page";
}, {
    readonly skillId: "diagnose-function-logs";
    readonly label: "功能排查-日志模式";
    readonly english: "Function diagnostics · Logs";
}, {
    readonly skillId: "diagnose-performance-page";
    readonly label: "性能排查-页面模式";
    readonly english: "Performance diagnostics · Page";
}, {
    readonly skillId: "diagnose-performance-logs";
    readonly label: "性能排查-日志模式";
    readonly english: "Performance diagnostics · Logs";
}];
/** Editable draft for the requirements group's HTML deliverable. */
export declare const REQUIREMENTS_HTML_PROMPT = "\u6839\u636E\u672C\u4F1A\u8BDD\u5DF2\u786E\u8BA4\u5E76\u901A\u8FC7\u4E00\u81F4\u6027\u6821\u9A8C\u7684\u9875\u9762\u89C4\u683C\uFF0C\u751F\u6210\u53EF\u8FD0\u884C\u7684 HTML \u9875\u9762\u3002\u4FDD\u7559\u5DF2\u786E\u8BA4\u7684\u9875\u9762\u5E03\u5C40\u3001\u5B57\u6BB5\u3001\u793A\u4F8B\u6570\u636E\u3001\u64CD\u4F5C\u3001\u72B6\u6001\u548C\u6743\u9650\uFF0C\u8986\u76D6\u9002\u7528\u7684\u6B63\u5E38\u3001\u7A7A\u3001\u52A0\u8F7D\u3001\u9519\u8BEF\u548C\u7981\u7528\u72B6\u6001\uFF0C\u652F\u6301\u5E38\u89C1\u5C4F\u5E55\u5BBD\u5EA6\u4E0E\u952E\u76D8\u64CD\u4F5C\u3002\u4F7F\u7528\u660E\u786E\u6807\u6CE8\u7684\u793A\u4F8B\u6570\u636E\uFF0C\u5173\u952E\u4E1A\u52A1\u4FE1\u606F\u7F3A\u5931\u65F6\u5148\u8BF4\u660E\u5E76\u786E\u8BA4\u3002\u6309\u7167\u9879\u76EE\u89C4\u5219\u9009\u62E9\u6587\u4EF6\u4F4D\u7F6E\uFF0C\u63D0\u4F9B\u6253\u5F00\u65B9\u5F0F\u5E76\u9A8C\u8BC1\u9875\u9762\uFF1B\u4E0D\u8FDE\u63A5\u751F\u4EA7\u540E\u7AEF\u3001\u4E0D\u63D0\u4EA4\u3001\u4E0D\u63A8\u9001\u3002";
/** Initial editable actions supplied when no configuration is saved. */
export declare const DEFAULT_ACTIONS: readonly CodingAction[];
/** Keep the old built-in visual action adjacent to text discussion without rewriting saved order. */
export declare function displayOrder(action: CodingAction): number;
/** Explicit opt-in: leave existing customized buttons untouched. */
export declare function missingDefaultActions(actions: readonly CodingAction[]): CodingAction[];
/** Translate presentation metadata for unsaved defaults only; persisted custom labels stay unchanged. */
export declare const ENGLISH_DEFAULT_PRESENTATION: Readonly<Record<string, Pick<CodingAction, 'label' | 'description' | 'example'>>>;
export declare function presentDefaultActions(actions: CodingAction[], english: boolean): CodingAction[];
/** Version written by this client: version 3 adds the optional `pinned` flag, which version-2 clients discard when they save. */
export declare const ACTION_SCHEMA_VERSION = 3;
/** Serialize a versioned action document.
 * @param actions Actions to persist.
 * @returns The JSON document.
 */
export declare const encodeActions: (actions: readonly CodingAction[]) => string;
/** Locale key naming why an action document failed validation. */
export type ActionConfigErrorKey = 'errorJson' | 'errorRoot' | 'errorVersion' | 'errorEntry' | 'errorId' | 'errorLabel' | 'errorKind' | 'errorSkillId' | 'errorFields' | 'errorTooltip';
export declare class ActionConfigError extends Error {
    readonly key: ActionConfigErrorKey;
    constructor(key: ActionConfigErrorKey);
}
/** Return a typed locale key without leaking internal validation messages to the UI. */
export declare function actionErrorKey(error: unknown): ActionConfigErrorKey | undefined;
/** Validate a persisted action document and copy defaults when absent.
 * Versions 1, 2, and 3 preserve saved content except the previous Chinese requirement preset labels;
 * version 1 also upgrades unchanged preset fields.
 * The retired `group` field is ignored and omitted from the parsed actions.
 * @param text Saved JSON or an absent configuration.
 * @returns Validated actions.
 */
export declare function parseActions(text: string | undefined): CodingAction[];
//# sourceMappingURL=actions.d.ts.map