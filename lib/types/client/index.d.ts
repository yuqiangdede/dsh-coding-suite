import { type LauncherLocaleKey } from './locales.ts';
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { GoalRef } from '@deepseek-ai/dsh-goal/client';
import type { CodingWorkflowSnapshot } from './workflow-source.ts';
/** Host-persisted launcher configuration. */
export interface ActionSettings {
    actionsJson?: string;
    layoutJson?: string;
}
/** Settings form and revision-checked save operation. */
export interface LauncherSettingsInjected {
    hooks: {
        actionForm: ConfigForm<ActionSettings>;
    };
    saveActions: (json: string, revision?: number) => Promise<boolean>;
    saveConfiguration: (actionsJson: string, layoutJson: string, revision?: number) => Promise<boolean>;
}
/** Outcome of one launcher-initiated workflow command. */
export interface WorkflowCommandResult {
    /** Whether the Host accepted the command. */
    readonly ok: boolean;
    /** Failure message for the notice line. */
    readonly message?: string;
}
/** Launcher mode values the workflow record understands. */
export type WorkflowMode = 'manual' | 'auto';
/** Launcher form, Skill catalog, the Session's coding Work Item, and the Host's stale-plan threshold. */
export interface LauncherInjected {
    hooks: {
        actionForm: ConfigForm<ActionSettings>;
        workflow: HostObservable<CodingWorkflowSnapshot>;
    };
    fetchSkillNames: () => Promise<readonly string[]>;
    saveLayout: (json: string, revision?: number) => Promise<boolean>;
    pauseWorkflow: (ref: GoalRef) => Promise<{
        readonly ok: true;
    } | {
        readonly ok: false;
        readonly error: {
            readonly message: string;
        };
    }>;
    /** Revision-checked mutations of the current coding task. */
    workflowCommands: {
        approve: (decision: string) => Promise<WorkflowCommandResult>;
        pause: () => Promise<WorkflowCommandResult>;
        resume: () => Promise<WorkflowCommandResult>;
        cancel: (reason: string) => Promise<WorkflowCommandResult>;
        setMode: (mode: WorkflowMode) => Promise<WorkflowCommandResult>;
    };
    todoStaleMs: number;
}
declare module '@deepseek-ai/dsh-api-session-controller/client' {
    interface SessionReferenceSourceMap {
        mattSkillLauncher: unknown;
    }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Launcher settings and insertion feedback. */
        mattSkillLauncher: LauncherLocaleKey;
    }
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map