/**
 * Pure state machine of one coding-workflow Work Item. Every transition
 * validates the caller's facts and returns a new record; Git and file effects
 * belong to the service that supplies {@link RepositorySnapshot} values.
 *
 * @module @deepseek-ai/dsh-coding-workflow/domain
 */
import type { CheckPlan, EvidenceRef, RepositorySnapshot, ReviewFinding, StageId, TaskId, VerificationRun, WorkItem, WorkflowMode } from './types.ts';
/** Automatic repair rounds a task may spend on a failing review. */
export declare const MAX_REPAIR_ROUNDS = 3;
/** Planned checks a configuration must declare. */
export declare const MIN_CHECKS = 2;
/** Upper bound on planned checks, keeping the plan reviewable. */
export declare const MAX_CHECKS = 12;
/** Upper bound on structured review findings per review. */
export declare const MAX_FINDINGS = 100;
/** Upper bound on one finding's evidence text. */
export declare const MAX_FINDING_EVIDENCE = 2000;
/** Upper bound on allowed implementation paths. */
export declare const MAX_ALLOWED_PATHS = 500;
/** Upper bound on one command argument. */
export declare const MAX_ARGUMENT_LENGTH = 500;
/** Upper bound on one command's argument count. */
export declare const MAX_COMMAND_ARGUMENTS = 32;
/** One rejected workflow operation with a stable code. */
export declare class WorkflowError extends Error {
    readonly code: string;
    /**
     * @param message - concrete, actionable explanation for the model or the UI.
     * @param code - stable upper-snake classification for callers.
     */
    constructor(message: string, code: string);
}
/**
 * Refuse operations on a task that already ended.
 * @param item - current record.
 */
export declare function requireNonterminal(item: WorkItem): void;
/**
 * Refuse progress while the task waits for a human or a resume.
 * @param item - current record.
 */
export declare function requireWritable(item: WorkItem): void;
/**
 * Require the tree to still be the one the task claimed.
 * @param item - current record.
 * @param snapshot - current repository facts.
 */
export declare function requireCheckpoint(item: WorkItem, snapshot: RepositorySnapshot): void;
/**
 * Require every earlier stage to be complete or explicitly skipped.
 * @param item - current record.
 * @param stage - stage whose prerequisites are checked.
 */
export declare function requirePrevious(item: WorkItem, stage: StageId): void;
/**
 * Require every changed file to be an allowed implementation path.
 * @param item - current record.
 * @param snapshot - current repository facts.
 */
export declare function requireScoped(item: WorkItem, snapshot: RepositorySnapshot): void;
/** Input that creates one task record. */
export interface CreateWorkItemInput {
    /** New task identity. */
    readonly taskId: TaskId;
    /** Owning Session. */
    readonly sessionId: WorkItem['sessionId'];
    /** Canonical workspace root. */
    readonly workspaceRoot: string;
    /** Human task title. */
    readonly title: string;
    /** Initial mode; switching never resumes work by itself. */
    readonly mode: WorkflowMode;
    /** Branch the task claims. */
    readonly branch: string;
    /** HEAD the task starts from. */
    readonly baseCommit: string;
    /** ISO-8601 creation time. */
    readonly now: string;
}
/**
 * Build the initial record: S0 is complete because the caller proved a clean
 * tree on a dedicated branch.
 * @param input - identity, workspace facts, and creation time.
 * @returns revision 1 at S1.
 */
export declare function createWorkItem(input: CreateWorkItemInput): WorkItem;
/**
 * Complete one evidence-only stage (S1, S2, S3, S4, S9).
 * @param item - current record.
 * @param stage - stage to complete.
 * @param evidence - accepted evidence file and digest.
 * @param snapshot - current repository facts.
 * @param now - ISO-8601 mutation time.
 * @returns the next record.
 */
export declare function applyStage(item: WorkItem, stage: Extract<StageId, 'S1' | 'S2' | 'S3' | 'S4' | 'S9'>, evidence: EvidenceRef, snapshot: RepositorySnapshot, now: string): WorkItem;
/**
 * Skip one eligible early stage (S1 or S2) with an explicit reason.
 * @param item - current record.
 * @param stage - stage to skip ('S1' | 'S2').
 * @param reason - reason why this stage is skipped (e.g. bugfix, minor change).
 * @param snapshot - current repository facts.
 * @param now - ISO-8601 mutation time.
 * @returns the next record.
 */
export declare function applySkip(item: WorkItem, stage: Extract<StageId, 'S1' | 'S2'>, reason: string, snapshot: RepositorySnapshot, now: string): WorkItem;
/** Plan accepted by the checks stage. */
export interface ChecksInput {
    /** Planned checks, one per kind. */
    readonly checks: readonly CheckPlan[];
    /** Exact files the implementation may touch. */
    readonly allowedPaths: readonly string[];
}
/**
 * Accept the implementation plan's checks and allowed paths.
 * @param item - current record at S4.
 * @param input - planned checks and allowed paths.
 * @param evidence - accepted plan evidence.
 * @param now - ISO-8601 mutation time.
 * @returns the next record.
 */
export declare function applyChecks(item: WorkItem, input: ChecksInput, evidence: EvidenceRef, now: string): WorkItem;
/**
 * Record one review outcome and route the task to repair, verification, or a
 * stop after repeated identical blocking findings.
 * @param item - current record at S5.
 * @param findings - structured findings from the review.
 * @param evidence - accepted review evidence.
 * @param snapshot - change set that was reviewed.
 * @param now - ISO-8601 mutation time.
 * @returns the next record.
 */
export declare function applyReview(item: WorkItem, findings: readonly ReviewFinding[], evidence: EvidenceRef, snapshot: RepositorySnapshot, now: string): WorkItem;
/**
 * Record one repair round after the failing review, rejecting a repair that
 * changed no source.
 * @param item - current record whose review failed.
 * @param evidence - accepted repair evidence.
 * @param snapshot - change set after the repair.
 * @param now - ISO-8601 mutation time.
 * @returns the next record, back at S5.
 */
export declare function applyRepair(item: WorkItem, evidence: EvidenceRef, snapshot: RepositorySnapshot, now: string): WorkItem;
/**
 * Fold one executed verification run into the record and settle S7.
 * @param item - current record at S7.
 * @param run - executed command and its observed outcome.
 * @param snapshot - change set after the run.
 * @param now - ISO-8601 mutation time.
 * @returns the next record.
 */
export declare function applyVerification(item: WorkItem, run: VerificationRun, snapshot: RepositorySnapshot, now: string): WorkItem;
/**
 * Record the local commit the service created.
 * @param item - current record at S8 with complete evidence.
 * @param commit - committed HEAD and the exact committed files.
 * @param now - ISO-8601 mutation time.
 * @returns the next record at S9.
 */
export declare function recordCommit(item: WorkItem, commit: {
    readonly commitRef: string;
    readonly files: readonly string[];
}, now: string): WorkItem;
/**
 * Preconditions for the local commit, checked before any Git staging.
 * @param item - current record.
 * @param snapshot - change set that will be committed.
 * @param files - exact files the caller wants to commit.
 */
export declare function requireCommitReady(item: WorkItem, snapshot: RepositorySnapshot, files: readonly string[]): void;
/**
 * Switch mode without resuming work.
 * @param item - current record.
 * @param mode - requested mode.
 * @param now - ISO-8601 mutation time.
 * @returns the paused record with the new mode.
 */
export declare function setMode(item: WorkItem, mode: WorkflowMode, now: string): WorkItem;
/**
 * Pause further progress.
 * @param item - current record.
 * @param now - ISO-8601 mutation time.
 * @returns the paused record.
 */
export declare function pause(item: WorkItem, now: string): WorkItem;
/**
 * Resume a paused, blocked, or ready task after re-checking its tree.
 * @param item - current record.
 * @param snapshot - current repository facts.
 * @param now - ISO-8601 mutation time.
 * @returns the runnable record.
 */
export declare function resume(item: WorkItem, snapshot: RepositorySnapshot, now: string): WorkItem;
/**
 * Ask a human for a scoped decision.
 * @param item - current record.
 * @param reason - concrete reason and proposed recovery.
 * @param now - ISO-8601 mutation time.
 * @returns the waiting record.
 */
export declare function requestApproval(item: WorkItem, reason: string, now: string): WorkItem;
/**
 * Record a scoped human approval and make the task runnable again.
 * @param item - current record.
 * @param decision - scoped decision text.
 * @param now - ISO-8601 mutation time.
 * @returns the approved record.
 */
export declare function approve(item: WorkItem, decision: string, now: string): WorkItem;
/**
 * Stop a task on an unrecoverable condition.
 * @param item - current record.
 * @param reason - concrete reason and proposed recovery.
 * @param now - ISO-8601 mutation time.
 * @returns the blocked record.
 */
export declare function block(item: WorkItem, reason: string, now: string): WorkItem;
/**
 * Cancel a task permanently.
 * @param item - current record.
 * @param reason - why the user cancelled.
 * @param now - ISO-8601 mutation time.
 * @returns the cancelled record.
 */
export declare function cancel(item: WorkItem, reason: string, now: string): WorkItem;
//# sourceMappingURL=domain.d.ts.map