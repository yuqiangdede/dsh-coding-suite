/**
 * Presentation of one coding Work Item: stage chips, blocker, and the
 * revision-checked commands a human may send. Pure props; the launcher owns
 * the Remote calls and the draft state.
 *
 * @module @deepseek-ai/dsh-client-ui-matt-skill-launcher/client/WorkflowPanel
 */
import type { WorkItem } from '../workflow/types.ts';
import type { LauncherLocaleKey } from './locales.ts';
/** Minimum decision text the Host accepts for an approval or a cancellation. */
export declare const MIN_DECISION_LENGTH = 8;
/** Props of the coding-task panel. */
export interface WorkflowPanelProps {
    /** Current durable record. */
    readonly item: WorkItem;
    /** Draft decision text. */
    readonly decision: string;
    /** Whether a command is in flight. */
    readonly pending: boolean;
    /** Update the decision draft. */
    readonly onDecision: (value: string) => void;
    /** Send one command to the Host. */
    readonly onAction: (action: 'approve' | 'pause' | 'resume' | 'cancel') => void;
    /** Locale lookup owned by the launcher seat. */
    readonly t: (key: LauncherLocaleKey) => string;
}
/**
 * Render one task's progress and commands.
 * @param props - record, draft, pending flag, callbacks, and locale lookup.
 * @returns the panel element.
 */
export declare function WorkflowPanel({ item, decision, pending, onDecision, onAction, t }: WorkflowPanelProps): import("react").JSX.Element;
