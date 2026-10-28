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