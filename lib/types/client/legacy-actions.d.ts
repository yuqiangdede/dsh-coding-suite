import type { CodingAction } from './actions.ts';
/** Version 1 preset values used only to distinguish untouched fields from user edits. */
export declare const LEGACY_ACTIONS: readonly CodingAction[];
/** English presentation values saved by version 1 clients. */
export declare const LEGACY_ENGLISH_PRESENTATION: Readonly<Record<string, Pick<CodingAction, 'label' | 'description' | 'example'>>>;
//# sourceMappingURL=legacy-actions.d.ts.map