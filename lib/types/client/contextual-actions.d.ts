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
/** Localized reason identifiers for advisory next-step recommendations. */
export type RecommendationReason = 'reasonReviewFindings' | 'reasonReviewClean' | 'reasonRequirementsReady' | 'reasonSpecReady' | 'reasonPlanReady' | 'reasonImplementationReady' | 'reasonRepairReady' | 'reasonBuildReady' | 'reasonPreviousFailed' | 'reasonResearchReady' | 'reasonPrototypeReady' | 'reasonArchitectureReady' | 'reasonDomainReady' | 'reasonHandoffReady';
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
 * Recommend the next enabled workflow step from the latest completed exchange.
 * @param entries - Finalized user and assistant messages in sequence order.
 * @param running - Whether the addressed Session is still running.
 * @returns An advisory recommendation, or `null` when the latest exchange is not actionable.
 */
export declare function recommend(entries: readonly ChatEntry[], running?: boolean): Recommendation | null;
/**
 * Add action-specific receiving instructions to an editable draft.
 * Only review repair carries a bounded summary of the earlier exchange; every other action
 * inserts its prompt without restating the conversation.
 * @param prompt - Configured action prompt.
 * @param recommendation - Current advisory recommendation.
 * @param actionId - Action being inserted.
 * @param entries - Latest completed exchange, independent of recommendation matching.
 * @param english - Whether the receiving instructions use English.
 * @returns A draft carrying the action's receiving task and, for review repair, the earlier excerpt.
 */
export declare function withEvidence(prompt: string, recommendation: Recommendation | null, actionId: string, entries?: readonly ChatEntry[], english?: boolean): string;
//# sourceMappingURL=contextual-actions.d.ts.map