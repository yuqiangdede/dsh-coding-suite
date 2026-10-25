/**
 * Repository effects of one coding-workflow task: read-only snapshots used by
 * every transition, evidence hashing, verification commands, and the single
 * local commit. No command here fetches, pushes, or writes a remote.
 *
 * @module @deepseek-ai/dsh-coding-workflow/repository
 */
import type { EvidenceRef, RepositorySnapshot } from './types.ts';
/** Outcome of one spawned command. */
export interface CommandResult {
    /** Exit code, or null when the process could not be started. */
    readonly exitCode: number | null;
    /** Captured standard output, bounded. */
    readonly stdout: string;
    /** Captured standard error, bounded. */
    readonly stderr: string;
    /** Spawn failure message, empty when the process ran. */
    readonly error: string;
}
/** Options one verification run accepts. */
export interface RunOptions {
    /** Caller cancellation. */
    readonly signal?: AbortSignal;
    /** Deadline after which the child is killed. */
    readonly timeoutMs?: number;
}
/** Repository operations the workflow service depends on. */
export interface RepositoryRunner {
    /**
     * Run one Git command and return its standard output.
     * @param root - repository root.
     * @param args - Git arguments.
     * @returns trimmed standard output.
     * @throws {WorkflowError} when Git exits non-zero or cannot start.
     */
    git(root: string, args: readonly string[]): Promise<string>;
}
/** Runner backed by the Host's own Git and process facilities. */
export declare class LocalRepositoryRunner implements RepositoryRunner {
    git(root: string, args: readonly string[]): Promise<string>;
}
/**
 * SHA-256 of one buffer or string.
 * @param data - bytes or text to hash.
 * @returns the lowercase hexadecimal digest.
 */
export declare function digest(data: string | Buffer): string;
/**
 * Read the branch, HEAD, and complete change set of one repository.
 * @param runner - repository operations.
 * @param root - repository root.
 * @returns the snapshot every transition validates against.
 */
export declare function readSnapshot(runner: RepositoryRunner, root: string): Promise<RepositorySnapshot>;
/**
 * Hash one evidence file. Evidence may live outside the workspace (temporary
 * notes, captured output); only its digest enters the record, so a file
 * outside the repository can never enter the task commit.
 * @param root - repository root that resolves a relative evidence path.
 * @param file - absolute or workspace-relative evidence path.
 * @returns the canonical reference accepted into the record.
 */
export declare function readEvidence(root: string, file: string): EvidenceRef;
/**
 * Verify that one recorded evidence file still holds the accepted content.
 * @param evidence - accepted reference.
 * @throws {WorkflowError} when the file vanished or changed.
 */
export declare function verifyEvidence(evidence: EvidenceRef): void;
/**
 * Run one planned verification command without a shell.
 * @param runner - repository operations.
 * @param root - repository root.
 * @param command - exact executable and arguments.
 * @param timeoutMs - deadline for this run.
 * @param signal - caller cancellation.
 * @returns the observed outcome.
 */
export declare function runVerification(execute: (root: string, command: readonly string[], options: RunOptions) => Promise<CommandResult>, root: string, command: readonly string[], timeoutMs: number, signal?: AbortSignal): Promise<CommandResult>;
/**
 * Create the task branch from the current HEAD.
 * @param runner - repository operations.
 * @param root - repository root.
 * @param branch - new branch name.
 */
export declare function createBranch(runner: RepositoryRunner, root: string, branch: string): Promise<void>;
/**
 * Stage exactly the listed files and create one local commit.
 * @param runner - repository operations.
 * @param root - repository root.
 * @param files - exact repository-relative files to commit.
 * @param message - commit message.
 * @returns the new HEAD commit.
 * @throws {WorkflowError} when a foreign staged change exists, the staged
 *   scope differs, hooks change the tree, or the tree is dirty afterwards.
 */
export declare function commitExactly(runner: RepositoryRunner, root: string, files: readonly string[], message: string): Promise<string>;
/**
 * Whether a branch name is one the workflow must never commit to directly.
 * @param branch - branch name to test.
 * @returns true for the protected trunk names.
 */
export declare function isProtectedBranch(branch: string): boolean;
//# sourceMappingURL=repository.d.ts.map