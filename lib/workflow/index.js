import { createHash, randomUUID } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import { brandString } from "@deepseek-ai/dsh-brand";
import { approveEscalation } from "@deepseek-ai/dsh-sandbox";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import z from "@deepseek-ai/schemastery";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { z as z$1 } from "zod";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/types.js
/**
* Durable and wire vocabulary of one coding-workflow Work Item: the staged
* evidence model the Host owns, the Remote exchanges with the browser, and the
* model reads through the `coding_workflow` tool.
*
* @module @deepseek-ai/dsh-coding-workflow/types
*/
/** Ordered stages of one workflow run. */
const WORKFLOW_STAGES = [
	"S0",
	"S1",
	"S2",
	"S3",
	"S4",
	"S5",
	"S6",
	"S7",
	"S8",
	"S9"
];
/** Check kinds a plan may use. */
const CHECK_KINDS$1 = [
	"test",
	"build",
	"lint",
	"typecheck",
	"integration"
];
/** File names that must never enter a task commit. */
const SENSITIVE_FILE = /(^|\/)(\.env(?:\..+)?|id_rsa|.*\.(?:pem|key)|credentials(?:\..+)?)$/i;
/** One rejected workflow operation with a stable code. */
var WorkflowError = class extends Error {
	code;
	/**
	* @param message - concrete, actionable explanation for the model or the UI.
	* @param code - stable upper-snake classification for callers.
	*/
	constructor(message, code) {
		super(message);
		this.code = code;
		this.name = "WorkflowError";
	}
};
/** Reject a condition that a caller must not violate. */
function ensure(condition, message, code) {
	if (!condition) throw new WorkflowError(message, code);
}
/** Position of one stage in the fixed order. */
function stageIndex(stage) {
	return WORKFLOW_STAGES.indexOf(stage);
}
/** Whether a stage finished successfully or was explicitly skipped. */
function completedOrSkipped(item, stage) {
	const status = item.stages[stage].status;
	return status === "completed" || status === "skipped";
}
/** Whether a stage finished successfully. */
function completed(item, stage) {
	return item.stages[stage].status === "completed";
}
/**
* Refuse operations on a task that already ended.
* @param item - current record.
*/
function requireNonterminal(item) {
	ensure(!["cancelled", "completed"].includes(item.status), "Task is terminal", "WORKFLOW_TERMINAL");
}
/**
* Refuse progress while the task waits for a human or a resume.
* @param item - current record.
*/
function requireWritable(item) {
	requireNonterminal(item);
	ensure(![
		"blocked",
		"waiting_approval",
		"paused"
	].includes(item.status), "Task is stopped; explicit resume or approval required", "WORKFLOW_STOPPED");
}
/**
* Require the tree to still be the one the task claimed.
* @param item - current record.
* @param snapshot - current repository facts.
*/
function requireCheckpoint(item, snapshot) {
	ensure(snapshot.branch === item.branch, "Branch changed", "WORKFLOW_BRANCH_CHANGED");
	ensure(snapshot.head === (item.commitRef ?? item.baseCommit), "HEAD changed outside workflow", "WORKFLOW_HEAD_CHANGED");
}
/**
* Require every earlier stage to be complete or explicitly skipped.
* @param item - current record.
* @param stage - stage whose prerequisites are checked.
*/
function requirePrevious(item, stage) {
	const index = stageIndex(stage);
	ensure(index > 0, "Unknown or reserved stage", "WORKFLOW_INVALID_STAGE");
	for (const previous of WORKFLOW_STAGES.slice(0, index)) ensure(completedOrSkipped(item, previous), `Prerequisite ${previous} not completed or skipped`, "WORKFLOW_STAGE_ORDER");
}
/**
* Require every changed file to be an allowed implementation path.
* @param item - current record.
* @param snapshot - current repository facts.
*/
function requireScoped(item, snapshot) {
	const allowed = item.allowedPaths;
	ensure(allowed !== null, "Implementation plan not configured", "WORKFLOW_PLAN_MISSING");
	const outside = snapshot.files.filter((file) => !allowed.includes(file));
	ensure(outside.length === 0, `Changes exceed explicitly allowed task paths: ${outside.slice(0, 5).join(", ")}`, "WORKFLOW_OUT_OF_SCOPE");
}
/** Validate one repository-relative path from a plan or commit list. */
function requireSafePath(file) {
	ensure(file.length > 0 && file.length < 500, "Empty or excessive file path", "WORKFLOW_UNSAFE_PATH");
	ensure(!file.includes("\\") && !file.includes("\0"), "Unsafe file path", "WORKFLOW_UNSAFE_PATH");
	ensure(!file.startsWith("/") && !/^[a-zA-Z]:/.test(file), "Absolute file path is not allowed", "WORKFLOW_UNSAFE_PATH");
	ensure(!file.split("/").includes("..") && file !== "." && file !== "..", "Unsafe file path", "WORKFLOW_UNSAFE_PATH");
	ensure(!file.startsWith(".git/") && !file.startsWith("node_modules/"), "Protected path is not allowed", "WORKFLOW_UNSAFE_PATH");
}
/** Reject evidence paths outside the workspace and files that vanished. */
function requireEvidence(evidence) {
	ensure(evidence.path.length > 0 && evidence.sha256.length === 64, "Invalid evidence reference", "WORKFLOW_EVIDENCE_INVALID");
}
/** Mark every later stage stale and drop dependent evidence. */
function invalidate(item, stage) {
	const index = stageIndex(stage);
	const stages = { ...item.stages };
	for (const later of WORKFLOW_STAGES.slice(index + 1)) {
		const current = stages[later];
		if (current.status !== "pending") stages[later] = {
			status: "stale",
			attempts: current.attempts
		};
	}
	const patch = { stages };
	if (index <= 3) {
		patch.checks = null;
		patch.allowedPaths = null;
	}
	if (index <= 4) {
		patch.review = null;
		patch.verification = null;
	}
	if (index <= 6) {
		patch.verification = null;
		patch.verificationRuns = [];
	}
	return patch;
}
/**
* Build the initial record: S0 is complete because the caller proved a clean
* tree on a dedicated branch.
* @param input - identity, workspace facts, and creation time.
* @returns revision 1 at S1.
*/
function createWorkItem(input) {
	const title = input.title.trim();
	ensure(title.length > 0 && title.length <= 1e3, "Missing or excessive task title", "WORKFLOW_INVALID_TITLE");
	ensure(input.workspaceRoot.length > 0, "Missing workspace root", "WORKFLOW_INVALID_WORKSPACE");
	ensure(input.branch.length > 0, "Detached HEAD not supported", "WORKFLOW_DETACHED_HEAD");
	const stages = Object.fromEntries(WORKFLOW_STAGES.map((stage) => [stage, stage === "S0" ? {
		status: "completed",
		attempts: 1
	} : {
		status: "pending",
		attempts: 0
	}]));
	return {
		schemaVersion: 1,
		revision: 1,
		taskId: input.taskId,
		sessionId: input.sessionId,
		workspaceRoot: input.workspaceRoot,
		title,
		mode: input.mode,
		status: "ready",
		currentStage: "S1",
		branch: input.branch,
		baseCommit: input.baseCommit,
		commitRef: null,
		stages,
		repairRounds: 0,
		noProgressRounds: 0,
		checks: null,
		allowedPaths: null,
		review: null,
		verification: null,
		verificationRuns: [],
		approval: null,
		blocker: null,
		createdAt: input.now,
		updatedAt: input.now
	};
}
/** Copy a mutation onto a new revision. */
function next(item, patch, now) {
	return {
		...item,
		...patch,
		revision: item.revision + 1,
		updatedAt: now
	};
}
/** Raise the revision of one stage while keeping its attempt count. */
function stageState$1(item, stage, state) {
	return {
		...item.stages,
		[stage]: state
	};
}
/**
* Complete one evidence-only stage (S1, S2, S3, S4, S9).
* @param item - current record.
* @param stage - stage to complete.
* @param evidence - accepted evidence file and digest.
* @param snapshot - current repository facts.
* @param now - ISO-8601 mutation time.
* @returns the next record.
*/
function applyStage(item, stage, evidence, snapshot, now) {
	requireCheckpoint(item, snapshot);
	requireWritable(item);
	requireEvidence(evidence);
	requirePrevious(item, stage);
	const invalidated = completed(item, stage) ? invalidate(item, stage) : {};
	const base = {
		...item,
		...invalidated
	};
	if (stage === "S4") {
		ensure(base.checks !== null && base.checks.length >= 2, "Test and build checks must be planned before implementation", "WORKFLOW_PLAN_MISSING");
		requireScoped(base, snapshot);
		ensure(snapshot.files.length > 0, "Implementation has no code changes", "WORKFLOW_NO_CHANGES");
	}
	if (stage === "S9") ensure(base.commitRef !== null, "No commit reference", "WORKFLOW_NO_COMMIT");
	const following = WORKFLOW_STAGES[stageIndex(stage) + 1] ?? stage;
	return next(base, {
		stages: stageState$1(base, stage, {
			status: "completed",
			attempts: base.stages[stage].attempts + 1,
			evidence
		}),
		currentStage: following,
		status: stage === "S9" ? "completed" : "ready"
	}, now);
}
/**
* Skip one eligible early stage (S1 or S2) with an explicit reason.
* @param item - current record.
* @param stage - stage to skip ('S1' | 'S2').
* @param reason - reason why this stage is skipped (e.g. bugfix, minor change).
* @param snapshot - current repository facts.
* @param now - ISO-8601 mutation time.
* @returns the next record.
*/
function applySkip(item, stage, reason, snapshot, now) {
	requireCheckpoint(item, snapshot);
	requireWritable(item);
	requirePrevious(item, stage);
	ensure(reason.trim().length >= 4, "Skip reason must be at least 4 characters", "WORKFLOW_INVALID_REASON");
	const following = WORKFLOW_STAGES[stageIndex(stage) + 1] ?? stage;
	return next(item, {
		stages: stageState$1(item, stage, {
			status: "skipped",
			attempts: item.stages[stage].attempts + 1,
			reason: reason.trim()
		}),
		currentStage: following,
		status: "ready"
	}, now);
}
/**
* Accept the implementation plan's checks and allowed paths.
* @param item - current record at S4.
* @param input - planned checks and allowed paths.
* @param evidence - accepted plan evidence.
* @param now - ISO-8601 mutation time.
* @returns the next record.
*/
function applyChecks(item, input, evidence, now) {
	requireNonterminal(item);
	requireEvidence(evidence);
	ensure(completed(item, "S3") && !completed(item, "S4"), "Checks must be configured between plan and implementation", "WORKFLOW_STAGE_ORDER");
	const checks = input.checks;
	ensure(checks.length >= 2 && checks.length <= 12, `Expected 2-12 test/build checks`, "WORKFLOW_INVALID_CHECKS");
	const kinds = checks.map((check) => check.kind);
	ensure(kinds.includes("test") && kinds.includes("build"), "Test and build checks are required", "WORKFLOW_INVALID_CHECKS");
	ensure(new Set(kinds).size === kinds.length, "Each check kind must be unique", "WORKFLOW_INVALID_CHECKS");
	for (const check of checks) {
		ensure(CHECK_KINDS$1.includes(check.kind), "Invalid check kind", "WORKFLOW_INVALID_CHECKS");
		ensure(check.command.length > 0 && check.command.length <= 32, "Invalid actual command", "WORKFLOW_INVALID_CHECKS");
		ensure(check.command.every((argument) => argument.length > 0 && argument.length <= 500), "Invalid command argument", "WORKFLOW_INVALID_CHECKS");
	}
	const allowed = input.allowedPaths;
	ensure(allowed.length > 0 && allowed.length <= 500, `Implementation plan requires 1-500 exact allowedPaths`, "WORKFLOW_INVALID_SCOPE");
	ensure(new Set(allowed).size === allowed.length, "Duplicate allowed file path", "WORKFLOW_INVALID_SCOPE");
	for (const file of allowed) requireSafePath(file);
	return next(item, {
		checks: checks.map((check) => ({
			kind: check.kind,
			command: [...check.command]
		})),
		allowedPaths: [...allowed].sort(),
		verificationRuns: []
	}, now);
}
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
function applyReview(item, findings, evidence, snapshot, now) {
	requireCheckpoint(item, snapshot);
	requireWritable(item);
	requireEvidence(evidence);
	requirePrevious(item, "S5");
	ensure(findings.length <= 100, "Too many review findings", "WORKFLOW_REVIEW_INVALID");
	for (const finding of findings) {
		ensure(finding.id.length > 0 && finding.id.length <= 200, "Invalid review finding id", "WORKFLOW_REVIEW_INVALID");
		ensure([
			"P0",
			"P1",
			"P2",
			"P3"
		].includes(finding.severity), "Invalid review severity", "WORKFLOW_REVIEW_INVALID");
		ensure([
			"open",
			"resolved",
			"accepted"
		].includes(finding.status), "Invalid review finding status", "WORKFLOW_REVIEW_INVALID");
		ensure(finding.file.length > 0 && finding.evidence.length > 0 && finding.evidence.length <= 2e3, "Invalid review finding evidence", "WORKFLOW_REVIEW_INVALID");
	}
	const open = findings.filter((finding) => ["P0", "P1"].includes(finding.severity) && finding.status !== "resolved");
	const current = snapshot.files;
	requireScoped(item, snapshot);
	ensure(current.length > 0 || snapshot.clean, "Review requires a readable change set", "WORKFLOW_NO_CHANGES");
	const findingIds = open.map((finding) => finding.id).sort();
	const prior = item.review;
	const noProgressRounds = prior !== null && prior.blockers > 0 && JSON.stringify(prior.findingIds) === JSON.stringify(findingIds) ? item.noProgressRounds + 1 : 0;
	const review = {
		...evidence,
		fingerprint: snapshot.fingerprint,
		blockers: open.length,
		findingIds
	};
	if (noProgressRounds >= 2) return next(item, {
		noProgressRounds,
		review,
		stages: stageState$1(item, "S5", {
			status: "blocked",
			attempts: item.stages.S5.attempts + 1,
			evidence
		}),
		status: "blocked",
		blocker: {
			reason: "Review found the same unresolved blocking issues after two repair iterations",
			stage: "S5"
		}
	}, now);
	return next(item, {
		noProgressRounds,
		review,
		stages: {
			...stageState$1(item, "S5", {
				status: open.length > 0 ? "failed" : "completed",
				attempts: item.stages.S5.attempts + 1,
				evidence
			}),
			S7: {
				status: "stale",
				attempts: item.stages.S7.attempts
			},
			S6: open.length === 0 ? item.repairRounds > 0 && item.stages.S6.status === "completed" ? item.stages.S6 : {
				status: "skipped",
				attempts: item.stages.S6.attempts,
				reason: "No blocking findings or repair needed"
			} : {
				status: "pending",
				attempts: item.stages.S6.attempts
			}
		},
		verification: null,
		verificationRuns: [],
		currentStage: open.length > 0 ? "S6" : "S7",
		status: "ready"
	}, now);
}
/**
* Record one repair round after the failing review, rejecting a repair that
* changed no source.
* @param item - current record whose review failed.
* @param evidence - accepted repair evidence.
* @param snapshot - change set after the repair.
* @param now - ISO-8601 mutation time.
* @returns the next record, back at S5.
*/
function applyRepair(item, evidence, snapshot, now) {
	requireCheckpoint(item, snapshot);
	requireWritable(item);
	requireEvidence(evidence);
	ensure(item.stages.S5.status === "failed", "No failed review requiring repair", "WORKFLOW_NO_FAILED_REVIEW");
	requireScoped(item, snapshot);
	ensure(item.review === null || snapshot.fingerprint !== item.review.fingerprint, "No diff changes; repair made no progress", "WORKFLOW_REPAIR_NO_PROGRESS");
	const repairRounds = item.repairRounds + 1;
	ensure(repairRounds <= 3, "Automatic repair limit reached", "WORKFLOW_REPAIR_LIMIT");
	return next(item, {
		repairRounds,
		stages: {
			...stageState$1(item, "S6", {
				status: "completed",
				attempts: repairRounds,
				evidence
			}),
			S5: {
				status: "pending",
				attempts: item.stages.S5.attempts
			},
			S7: {
				status: "stale",
				attempts: item.stages.S7.attempts
			}
		},
		currentStage: "S5",
		verification: null,
		verificationRuns: [],
		status: "ready"
	}, now);
}
/**
* Fold one executed verification run into the record and settle S7.
* @param item - current record at S7.
* @param run - executed command and its observed outcome.
* @param snapshot - change set after the run.
* @param now - ISO-8601 mutation time.
* @returns the next record.
*/
function applyVerification(item, run, snapshot, now) {
	requireWritable(item);
	requireCheckpoint(item, snapshot);
	requirePrevious(item, "S7");
	ensure(item.review !== null && item.review.blockers === 0, "Unresolved blocking review findings", "WORKFLOW_REVIEW_BLOCKERS");
	requireScoped(item, snapshot);
	ensure(item.review.fingerprint === snapshot.fingerprint, "Source changed after review", "WORKFLOW_SOURCE_CHANGED");
	const planned = item.checks?.find((check) => check.kind === run.kind);
	ensure(planned !== void 0, "Command is not part of the approved implementation plan", "WORKFLOW_UNPLANNED_CHECK");
	ensure(JSON.stringify(planned.command) === JSON.stringify(run.command), "Command is not part of the approved implementation plan", "WORKFLOW_UNPLANNED_CHECK");
	const runs = [...item.verificationRuns.filter((previous) => previous.kind !== run.kind), run];
	const allPassed = (item.checks ?? []).every((check) => runs.some((candidate) => candidate.kind === check.kind && candidate.passed && candidate.fingerprint === snapshot.fingerprint));
	const stage = !run.passed ? {
		status: "failed",
		attempts: item.stages.S7.attempts + 1,
		evidence: {
			path: "",
			sha256: run.logSha256
		}
	} : allPassed ? {
		status: "completed",
		attempts: item.stages.S7.attempts + 1,
		evidence: {
			path: "",
			sha256: run.logSha256
		}
	} : {
		status: "pending",
		attempts: item.stages.S7.attempts
	};
	return next(item, {
		verificationRuns: runs,
		verification: allPassed ? {
			passed: true,
			fingerprint: snapshot.fingerprint,
			runs
		} : null,
		stages: stageState$1(item, "S7", stage),
		currentStage: allPassed ? "S8" : "S7",
		status: run.passed ? "ready" : "blocked",
		...run.passed ? {} : { blocker: {
			reason: "Verification failed or changed source; inspect actual command and rerun",
			stage: "S7"
		} }
	}, now);
}
/**
* Record the local commit the service created.
* @param item - current record at S8 with complete evidence.
* @param commit - committed HEAD and the exact committed files.
* @param now - ISO-8601 mutation time.
* @returns the next record at S9.
*/
function recordCommit(item, commit, now) {
	requireNonterminal(item);
	requirePrevious(item, "S8");
	ensure(commit.commitRef.length > 0 && commit.files.length > 0, "Invalid commit result", "WORKFLOW_INVALID_COMMIT");
	ensure(item.branch !== "main" && item.branch !== "master", "Commit on main/master disallowed", "WORKFLOW_PROTECTED_BRANCH");
	return next(item, {
		commitRef: commit.commitRef,
		stages: stageState$1(item, "S8", {
			status: "completed",
			attempts: item.stages.S8.attempts + 1,
			evidence: {
				path: "",
				sha256: ""
			}
		}),
		currentStage: "S9",
		status: "ready"
	}, now);
}
/**
* Preconditions for the local commit, checked before any Git staging.
* @param item - current record.
* @param snapshot - change set that will be committed.
* @param files - exact files the caller wants to commit.
*/
function requireCommitReady(item, snapshot, files) {
	requireWritable(item);
	requireCheckpoint(item, snapshot);
	requirePrevious(item, "S8");
	requireScoped(item, snapshot);
	ensure(item.review !== null && item.review.fingerprint === snapshot.fingerprint, "Review is stale", "WORKFLOW_REVIEW_STALE");
	ensure(item.verification !== null && item.verification.fingerprint === snapshot.fingerprint, "Verification is stale", "WORKFLOW_VERIFICATION_STALE");
	ensure((item.checks ?? []).every((check) => item.verificationRuns.some((run) => run.kind === check.kind && run.passed && run.fingerprint === snapshot.fingerprint)), "Missing test/build evidence", "WORKFLOW_VERIFICATION_STALE");
	const listed = [...new Set(files)].sort();
	ensure(listed.length > 0, "Unsafe commit file list", "WORKFLOW_INVALID_COMMIT");
	for (const file of listed) requireSafePath(file);
	ensure(JSON.stringify(listed) === JSON.stringify(snapshot.files), "Unowned files or incomplete file list", "WORKFLOW_INVALID_COMMIT");
	ensure(listed.every((file) => !SENSITIVE_FILE.test(file)), "Sensitive candidate file", "WORKFLOW_INVALID_COMMIT");
}
/**
* Switch mode without resuming work.
* @param item - current record.
* @param mode - requested mode.
* @param now - ISO-8601 mutation time.
* @returns the paused record with the new mode.
*/
function setMode(item, mode, now) {
	requireNonterminal(item);
	ensure(mode === "manual" || mode === "auto", "Expected manual or auto", "WORKFLOW_INVALID_MODE");
	return next(item, {
		mode,
		status: item.status === "waiting_approval" ? "waiting_approval" : "paused"
	}, now);
}
/**
* Pause further progress.
* @param item - current record.
* @param now - ISO-8601 mutation time.
* @returns the paused record.
*/
function pause(item, now) {
	requireNonterminal(item);
	return next(item, { status: item.status === "waiting_approval" ? "waiting_approval" : "paused" }, now);
}
/**
* Resume a paused, blocked, or ready task after re-checking its tree.
* @param item - current record.
* @param snapshot - current repository facts.
* @param now - ISO-8601 mutation time.
* @returns the runnable record.
*/
function resume(item, snapshot, now) {
	requireNonterminal(item);
	requireCheckpoint(item, snapshot);
	ensure(item.status !== "waiting_approval", "Approval required", "WORKFLOW_APPROVAL_REQUIRED");
	return next(item, {
		status: "ready",
		blocker: null
	}, now);
}
/**
* Ask a human for a scoped decision.
* @param item - current record.
* @param reason - concrete reason and proposed recovery.
* @param now - ISO-8601 mutation time.
* @returns the waiting record.
*/
function requestApproval(item, reason, now) {
	requireNonterminal(item);
	const text = reason.trim();
	ensure(text.length >= 10, "Give a concrete reason and proposed recovery", "WORKFLOW_REASON_TOO_SHORT");
	return next(item, {
		status: "waiting_approval",
		blocker: {
			reason: text,
			stage: item.currentStage
		}
	}, now);
}
/**
* Record a scoped human approval and make the task runnable again.
* @param item - current record.
* @param decision - scoped decision text.
* @param now - ISO-8601 mutation time.
* @returns the approved record.
*/
function approve(item, decision, now) {
	requireNonterminal(item);
	ensure(item.status === "waiting_approval", "No pending approval", "WORKFLOW_NO_PENDING_APPROVAL");
	const text = decision.trim();
	ensure(text.length >= 8, "Missing scoped decision", "WORKFLOW_REASON_TOO_SHORT");
	return next(item, {
		approval: {
			decision: text,
			stage: item.currentStage,
			approvedAt: now
		},
		blocker: null,
		status: "ready"
	}, now);
}
/**
* Stop a task on an unrecoverable condition.
* @param item - current record.
* @param reason - concrete reason and proposed recovery.
* @param now - ISO-8601 mutation time.
* @returns the blocked record.
*/
function block(item, reason, now) {
	requireNonterminal(item);
	ensure(item.status !== "waiting_approval", "Pending approval cannot be replaced by a blocker", "WORKFLOW_APPROVAL_REQUIRED");
	const text = reason.trim();
	ensure(text.length >= 10, "Give a concrete reason and proposed recovery", "WORKFLOW_REASON_TOO_SHORT");
	return next(item, {
		status: "blocked",
		blocker: {
			reason: text,
			stage: item.currentStage
		}
	}, now);
}
/**
* Cancel a task permanently.
* @param item - current record.
* @param reason - why the user cancelled.
* @param now - ISO-8601 mutation time.
* @returns the cancelled record.
*/
function cancel(item, reason, now) {
	requireNonterminal(item);
	const text = reason.trim();
	ensure(text.length >= 8, "Give a reason for cancelling this Work Item", "WORKFLOW_REASON_TOO_SHORT");
	return next(item, {
		status: "cancelled",
		blocker: {
			reason: text,
			stage: item.currentStage
		}
	}, now);
}
//#endregion
//#region lib/types/spec.js
/**
* Durable domain declaration of coding-workflow Work Items: the zod schemas
* that validate the stored format and the `defineDomain` spec the service
* opens over the routed storage backend.
*
* @module @deepseek-ai/dsh-coding-workflow/spec
*/
/** Work Item id at the durable boundary; branding has no runtime representation. */
const taskId = z$1.string().transform((value) => value);
/** Session id at the durable boundary. */
const sessionId = z$1.string().transform((value) => brandString(value));
/** Evidence reference stored with an accepted stage. */
const evidenceRef = z$1.object({
	path: z$1.string(),
	sha256: z$1.string()
});
/** One stage's stored state. */
const stageState = z$1.object({
	status: z$1.enum([
		"pending",
		"running",
		"waiting_approval",
		"completed",
		"failed",
		"blocked",
		"skipped",
		"stale"
	]),
	attempts: z$1.number().int().nonnegative(),
	evidence: evidenceRef.optional(),
	reason: z$1.string().optional()
});
/** One planned verification command. */
const checkPlan = z$1.object({
	kind: z$1.enum([
		"test",
		"build",
		"lint",
		"typecheck",
		"integration"
	]),
	command: z$1.array(z$1.string())
});
/** Accepted review evidence. */
const reviewEvidence = evidenceRef.extend({
	fingerprint: z$1.string(),
	blockers: z$1.number().int().nonnegative(),
	findingIds: z$1.array(z$1.string())
});
/** One executed verification command. */
const verificationRun = z$1.object({
	kind: z$1.enum([
		"test",
		"build",
		"lint",
		"typecheck",
		"integration"
	]),
	command: z$1.array(z$1.string()),
	exitCode: z$1.number().int().nullable(),
	passed: z$1.boolean(),
	fingerprint: z$1.string(),
	logSha256: z$1.string(),
	error: z$1.string(),
	ranAt: z$1.string()
});
/** Accepted verification evidence. */
const verificationEvidence = z$1.object({
	passed: z$1.literal(true),
	fingerprint: z$1.string(),
	runs: z$1.array(verificationRun)
});
/** One scoped human approval. */
const workItemApproval = z$1.object({
	decision: z$1.string(),
	stage: z$1.enum(WORKFLOW_STAGES),
	approvedAt: z$1.string()
});
/** One blocker. */
const workItemBlocker = z$1.object({
	reason: z$1.string(),
	stage: z$1.enum(WORKFLOW_STAGES)
});
/**
* The complete stored Work Item. Every stage id is required, so a record that
* omits one fails validation instead of silently producing an unusable task.
*/
const workItemRecord = z$1.object({
	schemaVersion: z$1.literal(1),
	revision: z$1.number().int().positive(),
	taskId,
	sessionId,
	workspaceRoot: z$1.string(),
	title: z$1.string(),
	mode: z$1.enum(["manual", "auto"]),
	status: z$1.enum([
		"created",
		"ready",
		"running",
		"waiting_approval",
		"paused",
		"blocked",
		"completed",
		"cancelled"
	]),
	currentStage: z$1.enum(WORKFLOW_STAGES),
	branch: z$1.string(),
	baseCommit: z$1.string(),
	commitRef: z$1.string().nullable(),
	stages: z$1.record(z$1.enum(WORKFLOW_STAGES), stageState),
	repairRounds: z$1.number().int().nonnegative(),
	noProgressRounds: z$1.number().int().nonnegative(),
	checks: z$1.array(checkPlan).nullable(),
	allowedPaths: z$1.array(z$1.string()).nullable(),
	review: reviewEvidence.nullable(),
	verification: verificationEvidence.nullable(),
	verificationRuns: z$1.array(verificationRun),
	approval: workItemApproval.nullable(),
	blocker: workItemBlocker.nullable(),
	createdAt: z$1.string(),
	updatedAt: z$1.string()
});
/**
* The coding-workflow domain spec: one `workItems` table keyed by
* {@link TaskId}. Records are individual documents so one task's evidence
* rewrite never rewrites every stored task.
*/
const codingWorkflowDomainSpec = defineDomain({
	name: "coding_workflow",
	version: 1,
	layout: "per-record",
	global: {
		schema: z$1.object({ initialized: z$1.boolean() }),
		initial: { initialized: false }
	},
	tables: { work_items: domainTable(workItemRecord) }
});
//#endregion
//#region lib/types/repository.js
/**
* Repository effects of one coding-workflow task: read-only snapshots used by
* every transition, evidence hashing, verification commands, and the single
* local commit. No command here fetches, pushes, or writes a remote.
*
* @module @deepseek-ai/dsh-coding-workflow/repository
*/
/** Evidence files above this size are refused instead of copied. */
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
/** Process output retained per verification run. */
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
/** Default deadline for one Git command. */
const GIT_TIMEOUT_MS = 12e4;
/** Executables a verification gate must never use. */
const FORBIDDEN_EXECUTABLE = /^(?:git|svn|ssh|scp|curl|wget)(?:[.]exe)?$/i;
/** Shell metacharacters refused inside arguments of a shell-wrapped command. */
const SHELL_METACHARACTER = /[&|<>^%!"\r\n]/u;
/** Spawn a child process and capture bounded output. */
function spawnCaptured(root, command, shell, timeout, signal) {
	const [executable, ...args] = command;
	return new Promise((resolvePromise) => {
		if (executable === void 0) {
			resolvePromise({
				exitCode: null,
				stdout: "",
				stderr: "",
				error: "missing executable"
			});
			return;
		}
		const child = spawn(executable, args, {
			cwd: root,
			shell,
			windowsHide: true,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			...signal === void 0 ? {} : { signal }
		});
		let stdout = "";
		let stderr = "";
		const append = (target, chunk) => {
			const next = (target === "stdout" ? stdout : stderr) + chunk.toString("utf8");
			if (next.length > MAX_OUTPUT_BYTES) {
				const capped = next.slice(0, MAX_OUTPUT_BYTES);
				if (target === "stdout") stdout = capped;
				else stderr = capped;
				return;
			}
			if (target === "stdout") stdout = next;
			else stderr = next;
		};
		child.stdout.on("data", (chunk) => {
			append("stdout", chunk);
		});
		child.stderr.on("data", (chunk) => {
			append("stderr", chunk);
		});
		const timer = setTimeout(() => child.kill("SIGKILL"), timeout);
		child.once("error", (error) => {
			clearTimeout(timer);
			resolvePromise({
				exitCode: null,
				stdout,
				stderr,
				error: error.message
			});
		});
		child.once("close", (code) => {
			clearTimeout(timer);
			resolvePromise({
				exitCode: code,
				stdout,
				stderr,
				error: ""
			});
		});
	});
}
/** Runner backed by the Host's own Git and process facilities. */
var LocalRepositoryRunner = class {
	async git(root, args) {
		const result = await spawnCaptured(root, ["git", ...args], false, GIT_TIMEOUT_MS);
		if (result.exitCode !== 0) throw new WorkflowError((result.stderr || result.stdout || result.error || "git command failed").slice(0, 1800), "WORKFLOW_GIT_FAILED");
		return result.stdout;
	}
};
/**
* SHA-256 of one buffer or string.
* @param data - bytes or text to hash.
* @returns the lowercase hexadecimal digest.
*/
function digest(data) {
	return createHash("sha256").update(data).digest("hex");
}
/** Split NUL-separated Git path output. */
function nulSeparated(output) {
	return output.split("\0").filter(Boolean);
}
/**
* Read the branch, HEAD, and complete change set of one repository.
* @param runner - repository operations.
* @param root - repository root.
* @returns the snapshot every transition validates against.
*/
async function readSnapshot(runner, root) {
	const branch = (await runner.git(root, ["branch", "--show-current"])).trim();
	const head = (await runner.git(root, ["rev-parse", "HEAD"])).trim();
	const status = await runner.git(root, [
		"status",
		"--porcelain=v1",
		"-z"
	]);
	const diff = await runner.git(root, [
		"diff",
		"--binary",
		"HEAD"
	]);
	const changed = nulSeparated(await runner.git(root, [
		"diff",
		"--name-only",
		"-z",
		"HEAD"
	]));
	const untracked = nulSeparated(await runner.git(root, [
		"ls-files",
		"--others",
		"--exclude-standard",
		"-z"
	]));
	const files = [...new Set([...changed, ...untracked])].sort();
	const pieces = [status, diff];
	for (const file of files) {
		pieces.push(file);
		const full = resolve(root, file);
		if (!full.startsWith(root + sep)) throw new WorkflowError("Unsafe repository path", "WORKFLOW_UNSAFE_PATH");
		pieces.push(existsSync(full) && statSync(full).isFile() ? digest(readFileSync(full)) : "deleted-or-nonfile");
	}
	return {
		branch,
		head,
		clean: status.trim().length === 0,
		files,
		fingerprint: digest(pieces.join(""))
	};
}
/**
* Hash one evidence file. Evidence may live outside the workspace (temporary
* notes, captured output); only its digest enters the record, so a file
* outside the repository can never enter the task commit.
* @param root - repository root that resolves a relative evidence path.
* @param file - absolute or workspace-relative evidence path.
* @returns the canonical reference accepted into the record.
*/
function readEvidence(root, file) {
	const absolute = resolve(root, file);
	if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new WorkflowError("Evidence file missing", "WORKFLOW_EVIDENCE_INVALID");
	if (statSync(absolute).size >= MAX_EVIDENCE_BYTES) throw new WorkflowError("Evidence exceeds limit", "WORKFLOW_EVIDENCE_INVALID");
	return {
		path: absolute,
		sha256: digest(readFileSync(absolute))
	};
}
/**
* Verify that one recorded evidence file still holds the accepted content.
* @param evidence - accepted reference.
* @throws {WorkflowError} when the file vanished or changed.
*/
function verifyEvidence(evidence) {
	if (evidence.path.length === 0) return;
	if (!existsSync(evidence.path) || !statSync(evidence.path).isFile()) throw new WorkflowError("Stage evidence file is missing; rerun that stage", "WORKFLOW_EVIDENCE_CHANGED");
	if (digest(readFileSync(evidence.path)) !== evidence.sha256) throw new WorkflowError("Stage evidence changed after verification", "WORKFLOW_EVIDENCE_CHANGED");
}
/**
* Run one planned verification command without a shell.
* @param runner - repository operations.
* @param root - repository root.
* @param command - exact executable and arguments.
* @param timeoutMs - deadline for this run.
* @param signal - caller cancellation.
* @returns the observed outcome.
*/
async function runVerification(execute, root, command, timeoutMs, signal) {
	const executable = command[0];
	if (executable === void 0) throw new WorkflowError("Missing verification command", "WORKFLOW_INVALID_CHECKS");
	if (FORBIDDEN_EXECUTABLE.test(basename(executable))) throw new WorkflowError("VCS/network command cannot be used as a verification gate", "WORKFLOW_FORBIDDEN_COMMAND");
	if (process.platform === "win32" && (/[.]cmd$|[.]bat$/i.test(executable) || /^(?:pnpm|npm|npx|yarn)$/i.test(executable)) && command.some((argument) => SHELL_METACHARACTER.test(argument))) throw new WorkflowError("Unsafe shell metacharacters in Windows build command", "WORKFLOW_FORBIDDEN_COMMAND");
	return execute(root, command, {
		timeoutMs,
		...signal === void 0 ? {} : { signal }
	});
}
/**
* Create the task branch from the current HEAD.
* @param runner - repository operations.
* @param root - repository root.
* @param branch - new branch name.
*/
async function createBranch(runner, root, branch) {
	await runner.git(root, [
		"switch",
		"-c",
		branch
	]);
}
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
async function commitExactly(runner, root, files, message) {
	if ((await runner.git(root, [
		"diff",
		"--cached",
		"--name-only"
	])).trim() !== "") throw new WorkflowError("Foreign staged changes; refusing commit", "WORKFLOW_FOREIGN_STAGED");
	await runner.git(root, [
		"add",
		"--",
		...files
	]);
	const staged = nulSeparated(await runner.git(root, [
		"diff",
		"--cached",
		"--name-only",
		"-z"
	])).sort();
	if (JSON.stringify(staged) !== JSON.stringify([...files])) throw new WorkflowError("Staged scope mismatch", "WORKFLOW_STAGED_SCOPE");
	const plannedTree = (await runner.git(root, ["write-tree"])).trim();
	await runner.git(root, [
		"commit",
		"-m",
		message
	]);
	const head = (await runner.git(root, ["rev-parse", "HEAD"])).trim();
	if ((await runner.git(root, ["rev-parse", "HEAD^{tree}"])).trim() !== plannedTree) throw new WorkflowError(`Commit hooks changed the staged tree; local commit exists and requires manual inspection: ${head}`, "WORKFLOW_COMMIT_HOOKS");
	if ((await runner.git(root, ["status", "--porcelain"])).trim() !== "") throw new WorkflowError(`Post-commit changes detected; local commit exists and requires manual inspection: ${head}`, "WORKFLOW_COMMIT_DIRTY");
	return head;
}
/**
* Whether a branch name is one the workflow must never commit to directly.
* @param branch - branch name to test.
* @returns true for the protected trunk names.
*/
function isProtectedBranch(branch) {
	return branch === "main" || branch === "master";
}
//#endregion
//#region lib/types/guard.js
/**
* Tool-level enforcement for an active coding-workflow task. The guard is
* synchronous and monotonic: while a task owns the workspace, it refuses
* direct commits, destructive Git operations, and writes outside the planned
* implementation scope, so the model cannot route around the workflow verbs.
*
* @module @deepseek-ai/dsh-coding-workflow/guard
*/
/** Shell tools whose command string the guard inspects. */
const SHELL_TOOLS = new Set(["bash", "pwsh"]);
/** Tools that write repository content. */
const WRITE_TOOLS = new Set(["write", "edit"]);
/** Git operations a task must perform through the workflow tool instead. */
const SHELL_GIT_VIOLATION = /\bgit\s+(?:commit|push|reset|revert|checkout|switch|cherry-pick|rebase|merge|clean)\b/;
/** Task statuses in which no repository mutation may start. */
const STOPPED_STATUSES = new Set([
	"paused",
	"blocked",
	"waiting_approval"
]);
/** Read the shell command from a tool's raw arguments. */
function shellCommand(args) {
	if (typeof args !== "object" || args === null) return void 0;
	const command = args.command;
	return typeof command === "string" ? command : void 0;
}
/** Read the target path from a file-writing tool's raw arguments. */
function filePath(args) {
	if (typeof args !== "object" || args === null) return void 0;
	const path = args.file_path;
	return typeof path === "string" && path.length > 0 ? path : void 0;
}
/**
* Decide whether one tool call violates an active task.
* @param item - the calling Session's current Work Item.
* @param toolName - registered tool name.
* @param args - raw model arguments.
* @returns a denial reason, or undefined to allow the call.
*/
function guardDecision(item, toolName, args) {
	const shell = SHELL_TOOLS.has(toolName);
	const writes = WRITE_TOOLS.has(toolName);
	if (!shell && !writes) return void 0;
	const shortId = item.taskId.slice(0, 8);
	if (STOPPED_STATUSES.has(item.status)) return `coding_workflow: task ${shortId} is ${item.status.replaceAll("_", " ")}; resume it or answer the pending decision before changing the repository`;
	if (shell) {
		const command = shellCommand(args);
		if (command !== void 0 && SHELL_GIT_VIOLATION.test(command)) return `coding_workflow: task ${shortId} performs its single commit through the coding_workflow tool; direct git commit, push, reset, checkout, rebase, or merge is blocked while it is active`;
		return;
	}
	const path = filePath(args);
	if (path === void 0) return void 0;
	const allowed = item.allowedPaths;
	if (allowed === null || item.commitRef !== null) return void 0;
	const absolute = resolve(item.workspaceRoot, path);
	const root = item.workspaceRoot.endsWith(sep) ? item.workspaceRoot : item.workspaceRoot + sep;
	if (!absolute.startsWith(root)) return void 0;
	const file = relative(item.workspaceRoot, absolute).split(sep).join("/");
	if (allowed.includes(file)) return void 0;
	return `coding_workflow: "${file}" is outside the allowed paths of task ${shortId}; change the plan through the coding_workflow checks verb or keep the edit inside the planned scope`;
}
/**
* Build the registered guard for one service.
* @param resolveItem - synchronous lookup of the calling Agent's active task.
* @returns the monotonic tool guard.
*/
function codingWorkflowGuard(resolveItem) {
	return (execution) => {
		const agent = execution.agent;
		if (agent === void 0) return void 0;
		const item = resolveItem(agent);
		if (item === null) return void 0;
		return guardDecision(item, execution.name, execution.arguments);
	};
}
//#endregion
//#region lib/types/tool.js
const ACTIONS = [
    'start', 'status', 'stage', 'skip', 'checks', 'review', 'repair', 'verify', 'commit',
    'mode', 'pause', 'resume', 'approval', 'block', 'cancel',
];
const EVIDENCE_STAGES = ['S1', 'S2', 'S3', 'S4', 'S9'];
const CHECK_KINDS = ['test', 'build', 'lint', 'typecheck', 'integration'];
function nextStep(item) {
    if (item.status === 'blocked')
        return `resolve the blocker first: ${item.blocker?.reason ?? 'see blocker'}`;
    if (item.status === 'waiting_approval')
        return 'wait for the scoped human decision';
    if (item.status === 'paused')
        return 'wait for an explicit mode change or resume';
    switch (item.currentStage) {
        case 'S1': return 'feature/contract change: stage S1 requirements; proven existing-contract bug: explicit skip S1 with evidence-based reason; ask if ambiguous';
        case 'S2': return 'feature/contract change: stage S2 specification/design; existing-contract bug only: explicit skip S2 with reason why no design change is needed';
        case 'S3': return 'stage S3 (implementation plan evidence)';
        case 'S4': return item.checks === null ? 'checks (planned commands and allowed paths)' : 'stage S4 (implementation evidence)';
        case 'S5': return 'review (evidence plus structured findings)';
        case 'S6': return 'repair (fix the blocking findings)';
        case 'S7': return 'verify each planned check';
        case 'S8': return 'commit the exact changed files';
        default: return 'stage S9 (delivery report evidence)';
    }
}
function toValue(item) {
    return {
        taskId: item.taskId,
        revision: item.revision,
        status: item.status,
        currentStage: item.currentStage,
        mode: item.mode,
        branch: item.branch,
        commitRef: item.commitRef ?? '',
        blocker: item.blocker === null ? '' : `${item.blocker.stage}: ${item.blocker.reason}`,
        next: nextStep(item),
        stages: WORKFLOW_STAGES.map(stage => ({ stage, status: item.stages[stage].status })),
    };
}
function required(value, name) {
    if (value === undefined)
        throw new Error(`coding_workflow: "${name}" is required for this action`);
    return value;
}
function codingWorkflowTool(service) {
    return defineTool({
        name: 'coding_workflow',
        description: [
            'Drive one staged coding task with durable evidence gates. Call start before changing code; every later step refuses until its prerequisites are recorded.',
            'Stages: S0 workspace, S1 requirements, S2 specification, S3 plan, S4 implementation, S5 review, S6 repair, S7 verification, S8 local commit, S9 report.',
            'Agent selects bug vs feature from goal, context and evidence; ask if the expected contract is ambiguous. Bugs require reproduction, root-cause and regression evidence; only bugs restoring an unchanged contract may explicitly skip S1/S2 with reasons. Features or contract changes complete S1/S2. Both routes require S3 planning, structured review and passing planned test/build gates before commit.',
            'Evidence paths name files inside the workspace that prove the stage; checks must be planned before S4; verify runs each planned command; commit stages exactly the listed changed files. No push, merge, or remote write exists.',
        ].join(' '),
        parameters: {
            action: { type: 'string', required: true, enum: [...ACTIONS], description: 'Verb to run.' },
            title: { type: 'string', description: 'start: human task title.' },
            stage: { type: 'string', enum: [...EVIDENCE_STAGES], description: 'stage: stage whose evidence is recorded.' },
            evidencePath: { type: 'string', description: 'stage/checks/review/repair: workspace-relative evidence file.' },
            checks: {
                type: 'array',
                description: 'checks: planned verification commands (test and build required).',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        kind: { type: 'string', required: true, enum: [...CHECK_KINDS], description: 'Check kind.' },
                        command: {
                            type: 'array',
                            required: true,
                            items: { type: 'string' },
                            description: 'Executable and arguments, run without a shell.',
                        },
                    },
                },
            },
            allowedPaths: {
                type: 'array',
                items: { type: 'string' },
                description: 'checks: exact repository-relative files implementation may touch.',
            },
            findings: {
                type: 'array',
                description: 'review: structured findings.',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        id: { type: 'string', required: true, description: 'Stable finding id.' },
                        severity: { type: 'string', required: true, enum: ['P0', 'P1', 'P2', 'P3'], description: 'Severity.' },
                        status: { type: 'string', required: true, enum: ['open', 'resolved', 'accepted'], description: 'Disposition.' },
                        file: { type: 'string', required: true, description: 'Repository-relative file.' },
                        evidence: { type: 'string', required: true, description: 'Concrete evidence for the finding.' },
                    },
                },
            },
            kind: { type: 'string', enum: [...CHECK_KINDS], description: 'verify: planned check kind to run.' },
            command: { type: 'array', items: { type: 'string' }, description: 'verify: exact planned command.' },
            files: { type: 'array', items: { type: 'string' }, description: 'commit: exact changed files to commit.' },
            mode: { type: 'string', enum: ['manual', 'auto'], description: 'mode: switch without resuming.' },
            reason: { type: 'string', description: 'skip: evidence-based reason an existing-contract bug needs no S1/S2 change; approval/block/cancel: concrete reason and recovery.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    taskId: { type: 'string', required: true },
                    revision: { type: 'integer', required: true },
                    status: { type: 'string', required: true },
                    currentStage: { type: 'string', required: true },
                    mode: { type: 'string', required: true },
                    branch: { type: 'string', required: true },
                    commitRef: { type: 'string', required: true },
                    blocker: { type: 'string', required: true },
                    next: { type: 'string', required: true },
                    stages: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                stage: { type: 'string', required: true },
                                status: { type: 'string', required: true },
                            },
                        },
                    },
                },
            },
            render: (_args, value) => [{
                    type: 'text',
                    text: `Work Item ${value.taskId.slice(0, 8)} · ${value.status} · ${String(value.currentStage)} · ${value.mode}`
                        + (value.blocker === '' ? '' : `\nBlocked — ${value.blocker}`)
                        + `\nNext: ${value.next}`,
                }],
        },
        async execute(args, exec) {
            const agent = exec.agent;
            if (agent === undefined)
                throw new Error('coding_workflow requires an owning agent session');
            const action = args.action;
            switch (action) {
                case 'start': return toValue(await service.start(agent, required(args.title, 'title')));
                case 'status': {
                    const item = service.get(agent);
                    if (item === null)
                        throw new Error('coding_workflow: no Work Item in this Session; call start first');
                    return toValue(item);
                }
                case 'stage': return toValue(await service.stage(agent, {
                    stage: required(args.stage, 'stage'),
                    evidencePath: required(args.evidencePath, 'evidencePath'),
                }));
                case 'skip': {
                    const stage = required(args.stage, 'stage');
                    if (stage !== 'S1' && stage !== 'S2') {
                        throw new Error(`coding_workflow: stage "${String(stage)}" cannot be skipped; only S1 and S2 may be skipped`);
                    }
                    return toValue(await service.skip(agent, {
                        stage,
                        reason: required(args.reason, 'reason'),
                    }));
                }
                case 'checks': return toValue(await service.checks(agent, {
                    evidencePath: required(args.evidencePath, 'evidencePath'),
                    checks: required(args.checks, 'checks'),
                    allowedPaths: required(args.allowedPaths, 'allowedPaths'),
                }));
                case 'review': return toValue(await service.review(agent, {
                    evidencePath: required(args.evidencePath, 'evidencePath'),
                    findings: required(args.findings, 'findings'),
                }));
                case 'repair': return toValue(await service.repair(agent, required(args.evidencePath, 'evidencePath')));
                case 'verify': return toValue(await service.verify(agent, {
                    kind: required(args.kind, 'kind'),
                    command: required(args.command, 'command'),
                    callId: exec.callId,
                }, exec.signal));
                case 'commit': return toValue(await service.commit(agent, { files: required(args.files, 'files') }));
                case 'mode': return toValue(await service.updateMode(agent, required(args.mode, 'mode')));
                case 'pause': return toValue(await service.pauseCurrent(agent));
                case 'resume': return toValue(await service.resumeCurrent(agent));
                case 'approval': return toValue(await service.requestApproval(agent, required(args.reason, 'reason')));
                case 'block': return toValue(await service.block(agent, required(args.reason, 'reason')));
                case 'cancel': return toValue(await service.cancelCurrent(agent, required(args.reason, 'reason')));
                default: throw new Error(`coding_workflow: unknown action "${String(action)}"`);
            }
        },
    });
}
function registerCodingWorkflowTool(ctx, service) {
    return ctx.tools.register(codingWorkflowTool(service));
}
//#endregion
//#region lib/types/index.js
/**
* Host-authoritative service for coding-workflow Work Items. The service owns
* the durable record, validates every transition against the actual repository,
* runs registered verification commands, performs the single local commit, and
* publishes one change event per accepted mutation.
*
* @module @deepseek-ai/dsh-coding-workflow
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/** Quote one argv item for the composed POSIX shell or PowerShell executor. */
function quoteShellArgument(argument) {
	return process.platform === "win32" ? `'${argument.replaceAll("'", "''")}'` : `'${argument.replaceAll("'", "'\\''")}'`;
}
/** Coding-workflow service (`ctx.codingWorkflow`). */
let CodingWorkflowService = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _get_decorators;
	let _pause_decorators;
	let _resume_decorators;
	let _setMode_decorators;
	let _approve_decorators;
	let _cancel_decorators;
	return class CodingWorkflowService extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_get_decorators = [Remote("get")];
			_pause_decorators = [Remote("pause")];
			_resume_decorators = [Remote("resume")];
			_setMode_decorators = [Remote("setMode")];
			_approve_decorators = [Remote("approve")];
			_cancel_decorators = [Remote("cancel")];
			__esDecorate(this, null, _get_decorators, {
				kind: "method",
				name: "get",
				static: false,
				private: false,
				access: {
					has: (obj) => "get" in obj,
					get: (obj) => obj.get
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _pause_decorators, {
				kind: "method",
				name: "pause",
				static: false,
				private: false,
				access: {
					has: (obj) => "pause" in obj,
					get: (obj) => obj.pause
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _resume_decorators, {
				kind: "method",
				name: "resume",
				static: false,
				private: false,
				access: {
					has: (obj) => "resume" in obj,
					get: (obj) => obj.resume
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setMode_decorators, {
				kind: "method",
				name: "setMode",
				static: false,
				private: false,
				access: {
					has: (obj) => "setMode" in obj,
					get: (obj) => obj.setMode
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _approve_decorators, {
				kind: "method",
				name: "approve",
				static: false,
				private: false,
				access: {
					has: (obj) => "approve" in obj,
					get: (obj) => obj.approve
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _cancel_decorators, {
				kind: "method",
				name: "cancel",
				static: false,
				private: false,
				access: {
					has: (obj) => "cancel" in obj,
					get: (obj) => obj.cancel
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = [
			"storageDomain",
			"agents",
			"workingDirectory",
			"shell",
			"sandboxPolicy"
		];
		static Config = z.object({ verificationTimeoutMs: z.number().default(1800 * 1e3) });
		resolved = __runInitializers(this, _instanceExtraInitializers);
		runner;
		table;
		/**
		* @param ctx - owning context.
		* @param config - optional deployment settings.
		*/
		constructor(ctx, config = {}) {
			super(ctx, "codingWorkflow");
			if (ctx.shell.sandboxMode === void 0) throw new Error("coding-workflow requires a sandboxing shell executor for verification commands");
			const timeout = config.verificationTimeoutMs ?? 1800 * 1e3;
			if (!Number.isSafeInteger(timeout) || timeout < 1e3) throw new Error("coding-workflow: verificationTimeoutMs must be an integer of at least 1000 ms");
			this.resolved = { verificationTimeoutMs: timeout };
			this.runner = new LocalRepositoryRunner();
			ctx.inject(["tools"], (toolsCtx) => {
				toolsCtx.effect(() => registerCodingWorkflowTool(toolsCtx, this), "codingWorkflow.tool");
				toolsCtx.effect(() => toolsCtx.tools.guard(codingWorkflowGuard((agent) => this.inspect(agent))), "codingWorkflow.guard");
			});
		}
		/** Open the durable domain and close it with the plugin. */
		async [Service.init]() {
			const domain = await this.ctx.storageDomain.open(codingWorkflowDomainSpec);
			this.ctx.effect(() => () => domain.close(), "codingWorkflow.domainClose");
			this.table = domain.table("work_items");
		}
		/**
		* Start one Work Item on a clean tree; a protected branch gets a new task branch.
		* @param agent - live owning Agent.
		* @param title - human task title.
		* @returns the created record.
		*/
		async start(agent, title) {
			this.assertLive(agent);
			const root = this.workspaceRoot(agent);
			const initial = await readSnapshot(this.runner, root);
			if (!initial.clean) throw new WorkflowError("Working tree is dirty; cannot claim existing changes", "WORKFLOW_DIRTY_TREE");
			if (initial.branch.length === 0) throw new WorkflowError("Detached HEAD not supported", "WORKFLOW_DETACHED_HEAD");
			const existing = [...this.requireTable().entries()].map(([, item]) => item).filter((item) => !["completed", "cancelled"].includes(item.status));
			const sameBranch = existing.find((item) => item.workspaceRoot === root && item.branch === initial.branch);
			if (sameBranch !== void 0) throw new WorkflowError(`An unfinished Work Item already owns this branch: ${sameBranch.taskId}`, "WORKFLOW_BRANCH_OWNED");
			const sameSession = existing.find((item) => item.sessionId === agent.session.id);
			if (sameSession !== void 0) throw new WorkflowError(`This Session already owns an unfinished Work Item: ${sameSession.taskId}`, "WORKFLOW_SESSION_BUSY");
			const taskId = brandString(randomUUID());
			let snapshot = initial;
			if (isProtectedBranch(initial.branch)) {
				const branch = `coding/${taskId.slice(0, 8)}`;
				await createBranch(this.runner, root, branch);
				snapshot = await readSnapshot(this.runner, root);
			}
			const item = createWorkItem({
				taskId,
				sessionId: agent.session.id,
				workspaceRoot: root,
				title,
				mode: "manual",
				branch: snapshot.branch,
				baseCommit: snapshot.head,
				now: (/* @__PURE__ */ new Date()).toISOString()
			});
			await this.requireTable().put(taskId, item);
			this.publish(item);
			return item;
		}
		/**
		* Read the Session's current Work Item.
		* @param agent - live owning Agent.
		* @returns the newest unfinished record, else the newest record, else null.
		*/
		get(agent) {
			this.assertLive(agent);
			const owned = [...this.requireTable().entries()].map(([, item]) => item).filter((item) => item.sessionId === agent.session.id).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
			return owned.find((item) => !["completed", "cancelled"].includes(item.status)) ?? owned[0] ?? null;
		}
		/**
		* Read the Session's current unfinished Work Item without validating liveness.
		* The synchronous tool guard uses this path.
		* @param agent - calling Agent.
		* @returns the unfinished record, or null when the Session owns none.
		*/
		inspect(agent) {
			return this.getCurrent(agent);
		}
		/**
		* Complete one evidence-only stage.
		* @param agent - live owning Agent.
		* @param request - stage and evidence path.
		* @returns the next record.
		*/
		async stage(agent, request) {
			return this.transition(agent, (item, root, snapshot) => applyStage(item, request.stage, this.evidence(root, request.evidencePath), snapshot, this.now()));
		}
		/**
		* Skip one eligible stage (S1 or S2) with an explicit reason.
		* @param agent - live owning Agent.
		* @param request - stage to skip and concrete reason.
		* @returns the next record.
		*/
		async skip(agent, request) {
			return this.transition(agent, (item, _root, snapshot) => applySkip(item, request.stage, request.reason, snapshot, this.now()));
		}
		/**
		* Accept the implementation plan's checks and allowed paths.
		* @param agent - live owning Agent.
		* @param request - plan evidence, checks, and allowed paths.
		* @returns the next record.
		*/
		async checks(agent, request) {
			return this.transition(agent, (item, root) => applyChecks(item, {
				checks: request.checks,
				allowedPaths: request.allowedPaths
			}, this.evidence(root, request.evidencePath), this.now()));
		}
		/**
		* Record one structured review and route the task onward.
		* @param agent - live owning Agent.
		* @param request - review evidence and findings.
		* @returns the next record.
		*/
		async review(agent, request) {
			return this.transition(agent, (item, root, snapshot) => applyReview(item, request.findings, this.evidence(root, request.evidencePath), snapshot, this.now()));
		}
		/**
		* Record one repair round after a failing review.
		* @param agent - live owning Agent.
		* @param evidencePath - repair evidence path.
		* @returns the next record.
		*/
		async repair(agent, evidencePath) {
			return this.transition(agent, (item, root, snapshot) => applyRepair(item, this.evidence(root, evidencePath), snapshot, this.now()));
		}
		/**
		* Run one planned verification command and fold its outcome.
		* @param agent - live owning Agent.
		* @param request - planned kind and exact command.
		* @param signal - caller cancellation.
		* @returns the next record.
		*/
		async verify(agent, request, signal) {
			const item = this.requireCurrent(agent);
			requireWritable(item);
			const root = item.workspaceRoot;
			const before = await readSnapshot(this.runner, root);
			requireCheckpoint(item, before);
			requirePrevious(item, "S7");
			requireScoped(item, before);
			if (item.review === null || item.review.blockers !== 0 || item.review.fingerprint !== before.fingerprint) throw new WorkflowError("A current, clean review is required before verification", "WORKFLOW_REVIEW_STALE");
			const planned = item.checks?.find((check) => check.kind === request.kind);
			if (planned === void 0 || JSON.stringify(planned.command) !== JSON.stringify(request.command)) throw new WorkflowError("Command is not part of the approved implementation plan", "WORKFLOW_UNPLANNED_CHECK");
			const result = await runVerification((workdir, command, options) => this.runSandboxed(agent, workdir, command, options, request.callId), root, request.command, this.resolved.verificationTimeoutMs, signal);
			const after = await readSnapshot(this.runner, root);
			const run = {
				kind: request.kind,
				command: [...request.command],
				exitCode: result.exitCode,
				passed: result.exitCode === 0 && result.error === "" && after.fingerprint === before.fingerprint,
				fingerprint: before.fingerprint,
				logSha256: digest(result.stdout + result.stderr),
				error: result.error,
				ranAt: (/* @__PURE__ */ new Date()).toISOString()
			};
			return this.save(agent, applyVerification(item, run, after, this.now()));
		}
		/**
		* Stage exactly the listed files and create the task's single local commit.
		* @param agent - live owning Agent.
		* @param request - exact files to commit.
		* @returns the record at S9.
		*/
		async commit(agent, request) {
			const item = this.requireCurrent(agent);
			const root = item.workspaceRoot;
			requireCommitReady(item, await readSnapshot(this.runner, root), request.files);
			for (const stage of [
				"S1",
				"S2",
				"S3",
				"S4",
				"S5"
			]) {
				const evidence = item.stages[stage].evidence;
				if (evidence !== void 0) verifyEvidence(evidence);
			}
			const files = [...new Set(request.files)].sort();
			const message = `feat: ${item.title.slice(0, 65)} (${item.taskId.slice(0, 8)})`;
			const committed = recordCommit(item, {
				commitRef: await commitExactly(this.runner, root, files, message),
				files
			}, this.now());
			return this.save(agent, committed);
		}
		/**
		* Pause further progress.
		* @param agent - live owning Agent.
		* @param taskId - task identity.
		* @param revision - expected revision.
		* @returns the paused record.
		*/
		pause(agent, taskId, revision) {
			return this.updateByRef(agent, taskId, revision, (item) => pause(item, this.now()));
		}
		/**
		* Resume a paused, blocked, or ready task.
		* @param agent - live owning Agent.
		* @param taskId - task identity.
		* @param revision - expected revision.
		* @returns the runnable record.
		*/
		async resume(agent, taskId, revision) {
			const item = this.expect(agent, taskId, revision);
			const snapshot = await readSnapshot(this.runner, item.workspaceRoot);
			return this.save(agent, resume(item, snapshot, this.now()));
		}
		/**
		* Switch mode without resuming work.
		* @param agent - live owning Agent.
		* @param taskId - task identity.
		* @param revision - expected revision.
		* @param mode - requested mode.
		* @returns the paused record with the new mode.
		*/
		setMode(agent, taskId, revision, mode) {
			return this.updateByRef(agent, taskId, revision, (item) => setMode(item, mode, this.now()));
		}
		/**
		* Record a scoped human approval.
		* @param agent - live owning Agent.
		* @param taskId - task identity.
		* @param revision - expected revision.
		* @param decision - scoped decision text.
		* @returns the approved record.
		*/
		approve(agent, taskId, revision, decision) {
			return this.updateByRef(agent, taskId, revision, (item) => approve(item, decision, this.now()));
		}
		/**
		* Cancel a task permanently.
		* @param agent - live owning Agent.
		* @param taskId - task identity.
		* @param revision - expected revision.
		* @param reason - why the user cancelled.
		* @returns the cancelled record.
		*/
		cancel(agent, taskId, revision, reason) {
			return this.updateByRef(agent, taskId, revision, (item) => cancel(item, reason, this.now()));
		}
		/**
		* Ask a human for a scoped decision from the model path.
		* @param agent - live owning Agent.
		* @param reason - concrete reason and proposed recovery.
		* @returns the waiting record.
		*/
		async requestApproval(agent, reason) {
			return this.updateCurrent(agent, (item) => requestApproval(item, reason, this.now()));
		}
		/**
		* Stop a task on an unrecoverable condition from the model path.
		* @param agent - live owning Agent.
		* @param reason - concrete reason and proposed recovery.
		* @returns the blocked record.
		*/
		async block(agent, reason) {
			return this.updateCurrent(agent, (item) => block(item, reason, this.now()));
		}
		/**
		* Switch the current task's mode from the model path.
		* @param agent - live owning Agent.
		* @param mode - requested mode.
		* @returns the paused record with the new mode.
		*/
		async updateMode(agent, mode) {
			return this.updateCurrent(agent, (item) => setMode(item, mode, this.now()));
		}
		/**
		* Pause the current task from the model path.
		* @param agent - live owning Agent.
		* @returns the paused record.
		*/
		async pauseCurrent(agent) {
			return this.updateCurrent(agent, (item) => pause(item, this.now()));
		}
		/**
		* Resume the current task from the model path.
		* @param agent - live owning Agent.
		* @returns the runnable record.
		*/
		async resumeCurrent(agent) {
			const item = this.requireCurrent(agent);
			const snapshot = await readSnapshot(this.runner, item.workspaceRoot);
			return this.save(agent, resume(item, snapshot, this.now()));
		}
		/**
		* Cancel the current task from the model path.
		* @param agent - live owning Agent.
		* @param reason - why the task is cancelled.
		* @returns the cancelled record.
		*/
		async cancelCurrent(agent, reason) {
			return this.updateCurrent(agent, (item) => cancel(item, reason, this.now()));
		}
		/** Run one planned command through the composed shell and its sandbox policy. */
		async runSandboxed(agent, root, command, options, callId) {
			const standing = this.ctx.sandboxPolicy.resolve({ session: agent.session });
			let policy = standing;
			if (standing.mode === "read-only") {
				if (callId === void 0) throw new WorkflowError("A live tool call id is required for sandbox approval", "WORKFLOW_APPROVAL_REQUIRED");
				policy = {
					...standing,
					mode: await approveEscalation({
						requestedMode: "workspace-write",
						effectiveMode: standing.mode,
						justification: "Run the planned test/build command within the task workspace",
						subject: "command"
					}, {
						approver: this.ctx.get("approval"),
						agent,
						callId,
						toolName: "coding_workflow",
						...options.signal === void 0 ? {} : { signal: options.signal }
					})
				};
			}
			try {
				const result = await (await this.ctx.shell.execute(this.ctx.shell.resolve({
					command: command.map((argument) => quoteShellArgument(argument)).join(" "),
					workdir: root,
					...options.timeoutMs === void 0 ? {} : { timeoutMs: options.timeoutMs },
					...options.signal === void 0 ? {} : { signal: options.signal },
					sandboxPolicy: policy
				}))).result();
				return {
					exitCode: result.exitCode,
					stdout: result.stdout.text,
					stderr: result.stderr.text,
					error: result.aborted ? "verification command was aborted" : ""
				};
			} catch (error) {
				return {
					exitCode: null,
					stdout: "",
					stderr: "",
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
		/** Current Session record or a definite error. */
		requireCurrent(agent) {
			this.assertLive(agent);
			const item = this.getCurrent(agent);
			if (item === null) throw new WorkflowError("No current Work Item; start one first", "WORKFLOW_NO_TASK");
			return item;
		}
		/** Current Session record without the liveness error path. */
		getCurrent(agent) {
			return [...this.requireTable().entries()].map(([, item]) => item).filter((item) => item.sessionId === agent.session.id).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).find((item) => !["completed", "cancelled"].includes(item.status)) ?? null;
		}
		/** Apply one transition that needs repository facts. */
		async transition(agent, action) {
			const item = this.requireCurrent(agent);
			const snapshot = await readSnapshot(this.runner, item.workspaceRoot);
			return this.save(agent, action(item, item.workspaceRoot, snapshot));
		}
		/** Apply one transition that needs no repository facts. */
		updateCurrent(agent, action) {
			return this.save(agent, action(this.requireCurrent(agent)));
		}
		/** Apply one revision-checked transition addressed by task id. */
		async updateByRef(agent, taskId, revision, action) {
			return this.save(agent, action(this.expect(agent, taskId, revision)));
		}
		/** Load one task owned by the live Agent and check its revision. */
		expect(agent, taskId, revision) {
			this.assertLive(agent);
			const item = this.requireTable().get(taskId);
			if (item === void 0 || item.sessionId !== agent.session.id) throw new WorkflowError("Work Item not found for this Session", "WORKFLOW_NOT_FOUND");
			if (item.revision !== revision) throw new WorkflowError("Work Item changed concurrently; refresh and retry", "WORKFLOW_STALE_REVISION");
			return item;
		}
		/** Durably store one computed revision and publish it. */
		async save(agent, item) {
			this.assertLive(agent);
			const stored = await this.requireTable().update(item.taskId, (current) => {
				if (current.revision + 1 !== item.revision) throw new WorkflowError("Work Item changed concurrently; refresh and retry", "WORKFLOW_STALE_REVISION");
				return item;
			});
			this.publish(stored);
			return stored;
		}
		/** Publish one accepted mutation to the Host and its Client subscribers. */
		publish(item) {
			this.ctx.emit("coding-workflow/changed", {
				sessionId: item.sessionId,
				taskId: item.taskId,
				revision: item.revision,
				status: item.status,
				currentStage: item.currentStage
			});
		}
		/** Hash evidence inside the task workspace. */
		evidence(root, path) {
			return readEvidence(root, path);
		}
		/** Resolve the task workspace root from the Session's directory. */
		workspaceRoot(agent) {
			return this.ctx.workingDirectory.get(agent.session);
		}
		/** Enforce exact live-agent identity rather than trusting a matching id. */
		assertLive(agent) {
			if (this.ctx.agents.get(agent.id) !== agent) throw new WorkflowError(`agent "${agent.id}" is not live in this registry`, "WORKFLOW_AGENT_NOT_LIVE");
		}
		/** Current ISO-8601 time. */
		now() {
			return (/* @__PURE__ */ new Date()).toISOString();
		}
		/** The opened table or a definite startup error. */
		requireTable() {
			if (this.table === void 0) throw new Error("coding-workflow is not started yet");
			return this.table;
		}
	};
})();
//#endregion
export { CodingWorkflowService, CodingWorkflowService as default };
