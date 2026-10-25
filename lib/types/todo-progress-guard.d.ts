/**
 * Fork-owned, per-Session reminder when a live todo plan stops being updated.
 * This plugin never calls `todo_write`, changes a status, or touches files; it
 * only reads the `todos` Session projection and appends model-facing context.
 * Mounted inside the standard and PTC Agent presets, not the global Host plane.
 *
 * Progress is read from the authoritative projection, which the todo tool
 * replaces only when it commits a `todo/write` event and which the next
 * `turn/start` clears. A rejected write and a fresh turn therefore cancel the
 * watch without this plugin inspecting tool decisions or message sources.
 *
 * @module @deepseek-ai/dsh-client-ui-matt-skill-launcher/todo-progress-guard
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ContextFormed } from '@deepseek-ai/dsh-llm';
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        /** The fork-owned todo-progress reminder context. */
        'matt-todo-progress-guard': {
            kind: 'matt-todo-progress-guard';
        } & ContextFormed;
    }
}
/** Loader identity of this fork-owned guard. */
export declare const name = "matt-todo-progress-guard";
/** A todo plan lives in the Session projection the todo tool owns. */
export declare const inject: string[];
/** Reminder policy; every field is a validated deployment choice. */
export interface Config {
    /** Tool calls that must follow the last sync before a reminder is possible. */
    minToolCalls?: number;
    /** Milliseconds the plan must stay unchanged before a reminder is possible. */
    staleAfterMs?: number;
    /** Milliseconds between two reminders for one live plan. */
    reminderCooldownMs?: number;
}
export declare const Config: z<Config>;
/** One Session's progress counters; derived state, never persisted. */
export interface ProgressState {
    /** Wall clock of the last committed todo sync. */
    lastSyncAt: number;
    /** Tool calls observed since that sync. */
    callsSinceSync: number;
    /** Wall clock of the last reminder, or null before the first one. */
    lastReminderAt: number | null;
}
/** One observation: either no live plan, or the advanced counters and whether they are due. */
export type Observation = {
    readonly state: undefined;
    readonly remind: false;
} | {
    readonly state: ProgressState;
    readonly remind: boolean;
};
/**
 * Pure transition for one observed tool call, with an explicit clock so tests
 * are deterministic. `undefined` means no live plan is being watched.
 * @param state - the Session's counters, or undefined without a live plan.
 * @param now - current wall clock in milliseconds.
 * @param config - resolved reminder policy.
 * @returns the next counters and whether a reminder is due now.
 */
export declare function observeTool(state: ProgressState | undefined, now: number, config: Required<Config>): Observation;
/**
 * Install the guard's listener.
 * @param ctx - plugin context; the listener is scoped to it and disposed with it.
 * @param config - validated {@link Config}; fields are re-checked fail-loud here.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=todo-progress-guard.d.ts.map