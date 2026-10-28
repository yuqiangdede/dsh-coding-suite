/**
 * Host-authoritative service for coding-workflow Work Items. The service owns
 * the durable record, validates every transition against the actual repository,
 * runs registered verification commands, performs the single local commit, and
 * publishes one change event per accepted mutation.
 *
 * @module @deepseek-ai/dsh-coding-workflow
 */
import { Context, Service } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolCallId } from '@deepseek-ai/dsh-llm';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import type { CheckKind, CheckPlan, ReviewFinding, StageId, TaskId, WorkItem } from './types.ts';
/** Deployment settings of the workflow service. */
export interface Config {
    /** Deadline of one registered verification command. */
    verificationTimeoutMs?: number;
}
/** Validated settings. */
export interface ResolvedConfig {
    /** Positive deadline of one registered verification command. */
    verificationTimeoutMs: number;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Authoritative coding-workflow service. */
        codingWorkflow: CodingWorkflowService;
    }
}
/** Staged evidence a caller submits with one stage. */
export interface StageRequest {
    /** Stage to complete. */
    readonly stage: Extract<StageId, 'S1' | 'S2' | 'S3' | 'S4' | 'S9'>;
    /** Workspace-relative or absolute evidence path. */
    readonly evidencePath: string;
}
/** Request to skip one eligible stage with an explicit reason. */
export interface SkipRequest {
    /** Stage to skip ('S1' | 'S2'). */
    readonly stage: Extract<StageId, 'S1' | 'S2'>;
    /** Concrete reason for skipping this stage. */
    readonly reason: string;
}
/** Implementation plan accepted between S3 and S4. */
export interface ChecksRequest {
    /** Evidence of the accepted plan. */
    readonly evidencePath: string;
    /** Planned checks, one per kind. */
    readonly checks: readonly CheckPlan[];
    /** Exact files implementation may touch. */
    readonly allowedPaths: readonly string[];
}
/** Review report submitted at S5. */
export interface ReviewRequest {
    /** Evidence of the review. */
    readonly evidencePath: string;
    /** Structured findings. */
    readonly findings: readonly ReviewFinding[];
}
/** One verification command to run now. */
export interface VerifyRequest {
    /** Planned check kind. */
    readonly kind: CheckKind;
    /** Exact planned command. */
    readonly command: readonly string[];
    /** Tool call that owns any sandbox escalation prompt. */
    readonly callId?: ToolCallId;
}
/** Local commit request. */
export interface CommitRequest {
    /** Exact repository-relative files to commit. */
    readonly files: readonly string[];
}
/** Coding-workflow service (`ctx.codingWorkflow`). */
export declare class CodingWorkflowService extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private readonly resolved;
    private readonly runner;
    private table?;
    /**
     * @param ctx - owning context.
     * @param config - optional deployment settings.
     */
    constructor(ctx: Context, config?: Config);
    /** Open the durable domain and close it with the plugin. */
    protected [Service.init](): Promise<void>;
    /**
     * Start one Work Item on a clean tree; a protected branch gets a new task branch.
     * @param agent - live owning Agent.
     * @param title - human task title.
     * @returns the created record.
     */
    start(agent: Agent, title: string): Promise<WorkItem>;
    /**
     * Read the Session's current Work Item.
     * @param agent - live owning Agent.
     * @returns the newest unfinished record, else the newest record, else null.
     */
    get(agent: Agent): WorkItem | null;
    /**
     * Read the Session's current unfinished Work Item without validating liveness.
     * The synchronous tool guard uses this path.
     * @param agent - calling Agent.
     * @returns the unfinished record, or null when the Session owns none.
     */
    inspect(agent: Agent): WorkItem | null;
    /**
     * Complete one evidence-only stage.
     * @param agent - live owning Agent.
     * @param request - stage and evidence path.
     * @returns the next record.
     */
    stage(agent: Agent, request: StageRequest): Promise<WorkItem>;
    /**
     * Skip one eligible stage (S1 or S2) with an explicit reason.
     * @param agent - live owning Agent.
     * @param request - stage to skip and concrete reason.
     * @returns the next record.
     */
    skip(agent: Agent, request: SkipRequest): Promise<WorkItem>;
    /**
     * Accept the implementation plan's checks and allowed paths.
     * @param agent - live owning Agent.
     * @param request - plan evidence, checks, and allowed paths.
     * @returns the next record.
     */
    checks(agent: Agent, request: ChecksRequest): Promise<WorkItem>;
    /**
     * Record one structured review and route the task onward.
     * @param agent - live owning Agent.
     * @param request - review evidence and findings.
     * @returns the next record.
     */
    review(agent: Agent, request: ReviewRequest): Promise<WorkItem>;
    /**
     * Record one repair round after a failing review.
     * @param agent - live owning Agent.
     * @param evidencePath - repair evidence path.
     * @returns the next record.
     */
    repair(agent: Agent, evidencePath: string): Promise<WorkItem>;
    /**
     * Run one planned verification command and fold its outcome.
     * @param agent - live owning Agent.
     * @param request - planned kind and exact command.
     * @param signal - caller cancellation.
     * @returns the next record.
     */
    verify(agent: Agent, request: VerifyRequest, signal?: AbortSignal): Promise<WorkItem>;
    /**
     * Stage exactly the listed files and create the task's single local commit.
     * @param agent - live owning Agent.
     * @param request - exact files to commit.
     * @returns the record at S9.
     */
    commit(agent: Agent, request: CommitRequest): Promise<WorkItem>;
    /**
     * Pause further progress.
     * @param agent - live owning Agent.
     * @param taskId - task identity.
     * @param revision - expected revision.
     * @returns the paused record.
     */
    pause(agent: Agent, taskId: TaskId, revision: number): Promise<WorkItem>;
    /**
     * Resume a paused, blocked, or ready task.
     * @param agent - live owning Agent.
     * @param taskId - task identity.
     * @param revision - expected revision.
     * @returns the runnable record.
     */
    resume(agent: Agent, taskId: TaskId, revision: number): Promise<WorkItem>;
    /**
     * Record a scoped human approval.
     * @param agent - live owning Agent.
     * @param taskId - task identity.
     * @param revision - expected revision.
     * @param decision - scoped decision text.
     * @returns the approved record.
     */
    approve(agent: Agent, taskId: TaskId, revision: number, decision: string): Promise<WorkItem>;
    /**
     * Cancel a task permanently.
     * @param agent - live owning Agent.
     * @param taskId - task identity.
     * @param revision - expected revision.
     * @param reason - why the user cancelled.
     * @returns the cancelled record.
     */
    cancel(agent: Agent, taskId: TaskId, revision: number, reason: string): Promise<WorkItem>;
    /**
     * Ask a human for a scoped decision from the model path.
     * @param agent - live owning Agent.
     * @param reason - concrete reason and proposed recovery.
     * @returns the waiting record.
     */
    requestApproval(agent: Agent, reason: string): Promise<WorkItem>;
    /**
     * Stop a task on an unrecoverable condition from the model path.
     * @param agent - live owning Agent.
     * @param reason - concrete reason and proposed recovery.
     * @returns the blocked record.
     */
    block(agent: Agent, reason: string): Promise<WorkItem>;
    /**
     * Pause the current task from the model path.
     * @param agent - live owning Agent.
     * @returns the paused record.
     */
    pauseCurrent(agent: Agent): Promise<WorkItem>;
    /**
     * Resume the current task from the model path.
     * @param agent - live owning Agent.
     * @returns the runnable record.
     */
    resumeCurrent(agent: Agent): Promise<WorkItem>;
    /**
     * Cancel the current task from the model path.
     * @param agent - live owning Agent.
     * @param reason - why the task is cancelled.
     * @returns the cancelled record.
     */
    cancelCurrent(agent: Agent, reason: string): Promise<WorkItem>;
    /** Run one planned command through the composed shell and its sandbox policy. */
    private runSandboxed;
    /** Current Session record or a definite error. */
    private requireCurrent;
    /** Current Session record without the liveness error path. */
    private getCurrent;
    /** Apply one transition that needs repository facts. */
    private transition;
    /** Apply one transition that needs no repository facts. */
    private updateCurrent;
    /** Apply one revision-checked transition addressed by task id. */
    private updateByRef;
    /** Load one task owned by the live Agent and check its revision. */
    private expect;
    /** Durably store one computed revision and publish it. */
    private save;
    /** Publish one accepted mutation to the Host and its Client subscribers. */
    private publish;
    /** Hash evidence inside the task workspace. */
    private evidence;
    /** Resolve the task workspace root from the Session's directory. */
    private workspaceRoot;
    /** Enforce exact live-agent identity rather than trusting a matching id. */
    private assertLive;
    /** Current ISO-8601 time. */
    private now;
    /** The opened table or a definite startup error. */
    private requireTable;
}
export default CodingWorkflowService;
//# sourceMappingURL=index.d.ts.map