import { type LauncherLocaleKey } from './locales.ts';
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
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
/** Launcher form, Skill catalog, the Host's stale-plan threshold. */
export interface LauncherInjected {
    hooks: {
        actionForm: ConfigForm<ActionSettings>;
    };
    fetchSkillNames: () => Promise<readonly string[]>;
    saveLayout: (json: string, revision?: number) => Promise<boolean>;
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
