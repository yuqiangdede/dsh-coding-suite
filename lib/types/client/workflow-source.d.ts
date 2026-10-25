/**
 * Session-scoped observable over the Host-authoritative coding Work Item. The
 * Remote read is authoritative; a forwarded change event only schedules a new
 * read, so a late or repeated event can never publish a stale record.
 *
 * @module @deepseek-ai/dsh-client-ui-matt-skill-launcher/client/workflow-source
 */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { CodingWorkflowChanged, WorkItem } from '@deepseek-ai/dsh-coding-workflow/client';
/** One authoritative read, or a definite failure carrying a displayable message. */
export type CodingWorkflowRead = {
    readonly ok: true;
    readonly value: WorkItem | null;
} | {
    readonly ok: false;
    readonly error: {
        readonly message: string;
    };
};
/** What the launcher renders for one Session's task. */
export interface CodingWorkflowSnapshot {
    /** Current durable record, or null when the Session owns no task. */
    readonly item: WorkItem | null;
    /** Latest read failure, cleared by the next successful read. */
    readonly error: string | null;
    /** Whether the first read is still pending. */
    readonly loading: boolean;
}
/** Live inputs of one Session's workflow source. */
export interface CodingWorkflowSourceDeps {
    /** Authoritative read of the Session's current task. */
    readonly read: () => Promise<CodingWorkflowRead>;
    /** Subscribe to accepted mutations of the task. */
    readonly subscribeChange: (listener: (change: CodingWorkflowChanged) => void) => () => void;
    /** Subscribe to transport resets that invalidate prior reads. */
    readonly subscribeReset: (listener: () => void) => () => void;
}
/**
 * Create one registrant-private workflow source. Subscriptions start on the
 * first observer and release every listener when the last one leaves.
 * @param deps - read, change, and reset inputs.
 * @returns stable snapshot source consumed by `useWorkflow`.
 */
export declare function createCodingWorkflowSource(deps: CodingWorkflowSourceDeps): HostObservable<CodingWorkflowSnapshot>;
//# sourceMappingURL=workflow-source.d.ts.map