/** Read-only recommendations derived from finalized, visible chat messages. */
export interface ChatEntry {
    /** Speaker of a finalized conversation message. */
    role: 'user' | 'assistant';
    /** Plain text extracted from the message's text blocks. */
    text: string;
    /** Source sequence used to preserve message order. */
    seq: number;
    /** Whether the assistant message was interrupted or ended with an error. */
    failed?: boolean;
}
/**
 * Launcher button signature that attributes a request to the button that
 * inserted it, without guessing a workflow stage from prompt keywords.
 */
export interface ActionSignature {
    /** Configured button id. */
    readonly id: string;
    /** Insertion kind: skills start with their slash command, prompts with their own text. */
    readonly kind: 'skill' | 'prompt';
    /** Slash command name of a skill button. */
    readonly skillId?: string;
    /** Text a prompt button inserts at the front of the draft. */
    readonly prompt: string;
}
/** Localized reason identifiers for advisory next-step recommendations. */
export type RecommendationReason = 'reasonReviewFindings' | 'reasonReviewClean' | 'reasonRequirementsReady' | 'reasonSpecReady' | 'reasonPlanReady' | 'reasonImplementationReady' | 'reasonRepairReady' | 'reasonBuildReady' | 'reasonPreviousFailed' | 'reasonResearchReady' | 'reasonPrototypeReady' | 'reasonArchitectureReady' | 'reasonDomainReady' | 'reasonHandoffReady' | 'reasonProductStageReady' | 'reasonRequirementsRevision';
/** A suggested button set and the evidence used to choose it. */
export interface Recommendation {
    /** IDs of the available actions that can follow the completed step. */
    readonly ids: readonly string[];
    /** Finalized assistant text to include in a user-editable draft. */
    readonly evidence: string;
    /** Locale key describing why the action is suggested. */
    readonly reason: RecommendationReason;
}
/**
 * Read at most the latest completed user/assistant exchange from a Chat view.
 * @param view - Chat view snapshot or another registered view snapshot.
 * @returns The latest text exchange in sequence order, excluding tool output.
 */
export declare function chatEntries(view: unknown): ChatEntry[];
/**
 * Attribute a request to the button that inserted it.
 * @param text - Request text before any inserted context excerpt.
 * @param actions - Enabled launcher buttons.
 * @returns The matching button id, or `null` for hand-typed requests.
 */
export declare function actionIntent(text: string, actions: readonly ActionSignature[]): string | null;
/**
 * Recommend the next enabled workflow step from the latest completed exchange.
 * @param entries - Finalized user and assistant messages in sequence order.
 * @param running - Whether the addressed Session is still running.
 * @param actions - Enabled launcher buttons used to attribute a request without keyword guessing.
 * @returns An advisory recommendation, or `null` when the latest exchange is not actionable.
 */
export declare function recommend(entries: readonly ChatEntry[], running?: boolean, actions?: readonly ActionSignature[]): Recommendation | null;
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
export declare function withEvidence(prompt: string, _recommendation: Recommendation | null, actionId: string, _entries?: readonly ChatEntry[], english?: boolean): string;
//# sourceMappingURL=contextual-actions.d.ts.map