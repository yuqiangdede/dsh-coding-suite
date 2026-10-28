/**
 * Durable domain declaration of coding-workflow Work Items: the zod schemas
 * that validate the stored format and the `defineDomain` spec the service
 * opens over the routed storage backend.
 *
 * @module @deepseek-ai/dsh-coding-workflow/spec
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { z } from 'zod';
import type { TaskId, WorkItem } from './types.ts';
/**
 * The complete stored Work Item. Every stage id is required, so a record that
 * omits one fails validation instead of silently producing an unusable task.
 */
export declare const workItemRecord: z.ZodObject<{
    schemaVersion: z.ZodLiteral<1>;
    revision: z.ZodNumber;
    taskId: z.ZodPipe<z.ZodString, z.ZodTransform<TaskId, string>>;
    sessionId: z.ZodPipe<z.ZodString, z.ZodTransform<SessionId, string>>;
    workspaceRoot: z.ZodString;
    title: z.ZodString;
    status: z.ZodEnum<{
        created: "created";
        ready: "ready";
        running: "running";
        waiting_approval: "waiting_approval";
        paused: "paused";
        blocked: "blocked";
        completed: "completed";
        cancelled: "cancelled";
    }>;
    currentStage: z.ZodEnum<{
        S0: "S0";
        S1: "S1";
        S2: "S2";
        S3: "S3";
        S4: "S4";
        S5: "S5";
        S6: "S6";
        S7: "S7";
        S8: "S8";
        S9: "S9";
    }>;
    branch: z.ZodString;
    baseCommit: z.ZodString;
    commitRef: z.ZodNullable<z.ZodString>;
    stages: z.ZodRecord<z.ZodEnum<{
        S0: "S0";
        S1: "S1";
        S2: "S2";
        S3: "S3";
        S4: "S4";
        S5: "S5";
        S6: "S6";
        S7: "S7";
        S8: "S8";
        S9: "S9";
    }>, z.ZodObject<{
        status: z.ZodEnum<{
            pending: "pending";
            running: "running";
            waiting_approval: "waiting_approval";
            blocked: "blocked";
            completed: "completed";
            failed: "failed";
            skipped: "skipped";
            stale: "stale";
        }>;
        attempts: z.ZodNumber;
        evidence: z.ZodOptional<z.ZodObject<{
            path: z.ZodString;
            sha256: z.ZodString;
        }, z.core.$strip>>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    repairRounds: z.ZodNumber;
    noProgressRounds: z.ZodNumber;
    checks: z.ZodNullable<z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            test: "test";
            build: "build";
            lint: "lint";
            typecheck: "typecheck";
            integration: "integration";
        }>;
        command: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>>;
    allowedPaths: z.ZodNullable<z.ZodArray<z.ZodString>>;
    review: z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        sha256: z.ZodString;
        fingerprint: z.ZodString;
        blockers: z.ZodNumber;
        findingIds: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    verification: z.ZodNullable<z.ZodObject<{
        passed: z.ZodLiteral<true>;
        fingerprint: z.ZodString;
        runs: z.ZodArray<z.ZodObject<{
            kind: z.ZodEnum<{
                test: "test";
                build: "build";
                lint: "lint";
                typecheck: "typecheck";
                integration: "integration";
            }>;
            command: z.ZodArray<z.ZodString>;
            exitCode: z.ZodNullable<z.ZodNumber>;
            passed: z.ZodBoolean;
            fingerprint: z.ZodString;
            logSha256: z.ZodString;
            error: z.ZodString;
            ranAt: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    verificationRuns: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            test: "test";
            build: "build";
            lint: "lint";
            typecheck: "typecheck";
            integration: "integration";
        }>;
        command: z.ZodArray<z.ZodString>;
        exitCode: z.ZodNullable<z.ZodNumber>;
        passed: z.ZodBoolean;
        fingerprint: z.ZodString;
        logSha256: z.ZodString;
        error: z.ZodString;
        ranAt: z.ZodString;
    }, z.core.$strip>>;
    approval: z.ZodNullable<z.ZodObject<{
        decision: z.ZodString;
        stage: z.ZodEnum<{
            S0: "S0";
            S1: "S1";
            S2: "S2";
            S3: "S3";
            S4: "S4";
            S5: "S5";
            S6: "S6";
            S7: "S7";
            S8: "S8";
            S9: "S9";
        }>;
        approvedAt: z.ZodString;
    }, z.core.$strip>>;
    blocker: z.ZodNullable<z.ZodObject<{
        reason: z.ZodString;
        stage: z.ZodEnum<{
            S0: "S0";
            S1: "S1";
            S2: "S2";
            S3: "S3";
            S4: "S4";
            S5: "S5";
            S6: "S6";
            S7: "S7";
            S8: "S8";
            S9: "S9";
        }>;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
/** Stored Work Item shape inferred from {@link workItemRecord}. */
export type WorkItemRecord = z.infer<typeof workItemRecord>;
/**
 * Compile-time proof that the stored schema and the wire record agree in both
 * directions; a drifted field on either side fails this assignment.
 */
export declare const RECORD_MATCHES_WIRE: WorkItemRecord extends WorkItem ? WorkItem extends WorkItemRecord ? true : never : never;
/**
 * Durable registry state: revision-independent facts a Service restart keeps.
 * The global stays reserved for this record so later fields can be added
 * without changing the table layout.
 */
declare const codingWorkflowDomainState: z.ZodObject<{
    initialized: z.ZodBoolean;
}, z.core.$strip>;
/** Stored registry state inferred from {@link codingWorkflowDomainState}. */
export type CodingWorkflowDomainState = z.infer<typeof codingWorkflowDomainState>;
/**
 * The coding-workflow domain spec: one `workItems` table keyed by
 * {@link TaskId}. Records are individual documents so one task's evidence
 * rewrite never rewrites every stored task.
 */
export declare const codingWorkflowDomainSpec: {
    name: string;
    version: number;
    layout: "per-record";
    global: {
        schema: z.ZodObject<{
            initialized: z.ZodBoolean;
        }, z.core.$strip>;
        initial: {
            initialized: boolean;
        };
    };
    tables: {
        work_items: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<TaskId, {
            schemaVersion: 1;
            revision: number;
            taskId: TaskId;
            sessionId: SessionId;
            workspaceRoot: string;
            title: string;
            status: "created" | "ready" | "running" | "waiting_approval" | "paused" | "blocked" | "completed" | "cancelled";
            currentStage: "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";
            branch: string;
            baseCommit: string;
            commitRef: string | null;
            stages: Record<"S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9", {
                status: "pending" | "running" | "waiting_approval" | "blocked" | "completed" | "failed" | "skipped" | "stale";
                attempts: number;
                evidence?: {
                    path: string;
                    sha256: string;
                } | undefined;
                reason?: string | undefined;
            }>;
            repairRounds: number;
            noProgressRounds: number;
            checks: {
                kind: "test" | "build" | "lint" | "typecheck" | "integration";
                command: string[];
            }[] | null;
            allowedPaths: string[] | null;
            review: {
                path: string;
                sha256: string;
                fingerprint: string;
                blockers: number;
                findingIds: string[];
            } | null;
            verification: {
                passed: true;
                fingerprint: string;
                runs: {
                    kind: "test" | "build" | "lint" | "typecheck" | "integration";
                    command: string[];
                    exitCode: number | null;
                    passed: boolean;
                    fingerprint: string;
                    logSha256: string;
                    error: string;
                    ranAt: string;
                }[];
            } | null;
            verificationRuns: {
                kind: "test" | "build" | "lint" | "typecheck" | "integration";
                command: string[];
                exitCode: number | null;
                passed: boolean;
                fingerprint: string;
                logSha256: string;
                error: string;
                ranAt: string;
            }[];
            approval: {
                decision: string;
                stage: "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";
                approvedAt: string;
            } | null;
            blocker: {
                reason: string;
                stage: "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";
            } | null;
            createdAt: string;
            updatedAt: string;
        }>;
    };
};
export {};
//# sourceMappingURL=spec.d.ts.map