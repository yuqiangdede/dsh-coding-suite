/** Read-only per-workspace engineering Skills configuration check. */
export interface ProjectSetupReport {
    readonly ready: boolean;
    readonly missing: readonly string[];
}
export type ProjectSetupReader = (path: string) => Promise<string | null>;
/** A conversation reply or a cached click cannot establish initialization. */
export declare function evaluateProjectSetup(read: ProjectSetupReader, skills: readonly string[]): Promise<ProjectSetupReport>;
//# sourceMappingURL=setup-readiness.d.ts.map