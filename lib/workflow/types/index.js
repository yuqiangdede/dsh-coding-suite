/**
 * Host-authoritative service for coding-workflow Work Items. The service owns
 * the durable record, validates every transition against the actual repository,
 * runs registered verification commands, performs the single local commit, and
 * publishes one change event per accepted mutation.
 *
 * @module @deepseek-ai/dsh-coding-workflow
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { randomUUID } from 'node:crypto';
import { Service } from '@deepseek-ai/cordis';
import { brandString } from '@deepseek-ai/dsh-brand';
import { approveEscalation } from '@deepseek-ai/dsh-sandbox';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import { WorkflowError, applyChecks, applyRepair, applyReview, applySkip, applyStage, applyVerification, approve, block, cancel, createWorkItem, pause, recordCommit, requestApproval, requireCommitReady, requireCheckpoint, requirePrevious, requireScoped, requireWritable, resume, setMode, } from "./domain.js";
import { codingWorkflowDomainSpec } from "./spec.js";
import { LocalRepositoryRunner, commitExactly, createBranch, digest, isProtectedBranch, readEvidence, readSnapshot, runVerification, verifyEvidence, } from "./repository.js";
import { codingWorkflowGuard } from "./guard.js";
import { registerCodingWorkflowTool } from "./tool.js";
/** Quote one argv item for the composed POSIX shell or PowerShell executor. */
function quoteShellArgument(argument) {
    return process.platform === 'win32'
        ? `'${argument.replaceAll("'", "''")}'`
        : `'${argument.replaceAll("'", "'\\''")}'`;
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
            _get_decorators = [Remote('get')];
            _pause_decorators = [Remote('pause')];
            _resume_decorators = [Remote('resume')];
            _setMode_decorators = [Remote('setMode')];
            _approve_decorators = [Remote('approve')];
            _cancel_decorators = [Remote('cancel')];
            __esDecorate(this, null, _get_decorators, { kind: "method", name: "get", static: false, private: false, access: { has: obj => "get" in obj, get: obj => obj.get }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _pause_decorators, { kind: "method", name: "pause", static: false, private: false, access: { has: obj => "pause" in obj, get: obj => obj.pause }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resume_decorators, { kind: "method", name: "resume", static: false, private: false, access: { has: obj => "resume" in obj, get: obj => obj.resume }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setMode_decorators, { kind: "method", name: "setMode", static: false, private: false, access: { has: obj => "setMode" in obj, get: obj => obj.setMode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _approve_decorators, { kind: "method", name: "approve", static: false, private: false, access: { has: obj => "approve" in obj, get: obj => obj.approve }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _cancel_decorators, { kind: "method", name: "cancel", static: false, private: false, access: { has: obj => "cancel" in obj, get: obj => obj.cancel }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['storageDomain', 'agents', 'workingDirectory', 'shell', 'sandboxPolicy'];
        static Config = z.object({
            verificationTimeoutMs: z.number().default(30 * 60 * 1000),
        });
        resolved = __runInitializers(this, _instanceExtraInitializers);
        runner;
        table;
        /**
         * @param ctx - owning context.
         * @param config - optional deployment settings.
         */
        constructor(ctx, config = {}) {
            super(ctx, 'codingWorkflow');
            if (ctx.shell.sandboxMode === undefined) {
                throw new Error('coding-workflow requires a sandboxing shell executor for verification commands');
            }
            const timeout = config.verificationTimeoutMs ?? 30 * 60 * 1000;
            if (!Number.isSafeInteger(timeout) || timeout < 1000) {
                throw new Error('coding-workflow: verificationTimeoutMs must be an integer of at least 1000 ms');
            }
            this.resolved = { verificationTimeoutMs: timeout };
            this.runner = new LocalRepositoryRunner();
            ctx.inject(['tools'], (toolsCtx) => {
                toolsCtx.effect(() => registerCodingWorkflowTool(toolsCtx, this), 'codingWorkflow.tool');
                toolsCtx.effect(() => toolsCtx.tools.guard(codingWorkflowGuard(agent => this.inspect(agent))), 'codingWorkflow.guard');
            });
        }
        /** Open the durable domain and close it with the plugin. */
        async [Service.init]() {
            const domain = await this.ctx.storageDomain.open(codingWorkflowDomainSpec);
            this.ctx.effect(() => () => domain.close(), 'codingWorkflow.domainClose');
            this.table = domain.table('work_items');
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
            if (!initial.clean)
                throw new WorkflowError('Working tree is dirty; cannot claim existing changes', 'WORKFLOW_DIRTY_TREE');
            if (initial.branch.length === 0)
                throw new WorkflowError('Detached HEAD not supported', 'WORKFLOW_DETACHED_HEAD');
            const existing = [...this.requireTable().entries()]
                .map(([, item]) => item)
                .filter(item => !['completed', 'cancelled'].includes(item.status));
            const sameBranch = existing.find(item => item.workspaceRoot === root && item.branch === initial.branch);
            if (sameBranch !== undefined) {
                throw new WorkflowError(`An unfinished Work Item already owns this branch: ${sameBranch.taskId}`, 'WORKFLOW_BRANCH_OWNED');
            }
            const sameSession = existing.find(item => item.sessionId === agent.session.id);
            if (sameSession !== undefined) {
                throw new WorkflowError(`This Session already owns an unfinished Work Item: ${sameSession.taskId}`, 'WORKFLOW_SESSION_BUSY');
            }
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
                mode: 'manual',
                branch: snapshot.branch,
                baseCommit: snapshot.head,
                now: new Date().toISOString(),
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
            const owned = [...this.requireTable().entries()]
                .map(([, item]) => item)
                .filter(item => item.sessionId === agent.session.id)
                .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
            return owned.find(item => !['completed', 'cancelled'].includes(item.status)) ?? owned[0] ?? null;
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
            return this.transition(agent, (item, root) => applyChecks(item, { checks: request.checks, allowedPaths: request.allowedPaths }, this.evidence(root, request.evidencePath), this.now()));
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
            requirePrevious(item, 'S7');
            requireScoped(item, before);
            if (item.review === null || item.review.blockers !== 0 || item.review.fingerprint !== before.fingerprint) {
                throw new WorkflowError('A current, clean review is required before verification', 'WORKFLOW_REVIEW_STALE');
            }
            const planned = item.checks?.find(check => check.kind === request.kind);
            if (planned === undefined || JSON.stringify(planned.command) !== JSON.stringify(request.command)) {
                throw new WorkflowError('Command is not part of the approved implementation plan', 'WORKFLOW_UNPLANNED_CHECK');
            }
            const result = await runVerification((workdir, command, options) => this.runSandboxed(agent, workdir, command, options, request.callId), root, request.command, this.resolved.verificationTimeoutMs, signal);
            const after = await readSnapshot(this.runner, root);
            const run = {
                kind: request.kind,
                command: [...request.command],
                exitCode: result.exitCode,
                passed: result.exitCode === 0 && result.error === '' && after.fingerprint === before.fingerprint,
                fingerprint: before.fingerprint,
                logSha256: digest(result.stdout + result.stderr),
                error: result.error,
                ranAt: new Date().toISOString(),
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
            const snapshot = await readSnapshot(this.runner, root);
            requireCommitReady(item, snapshot, request.files);
            for (const stage of ['S1', 'S2', 'S3', 'S4', 'S5']) {
                const evidence = item.stages[stage].evidence;
                if (evidence !== undefined)
                    verifyEvidence(evidence);
            }
            const files = [...new Set(request.files)].sort();
            const message = `feat: ${item.title.slice(0, 65)} (${item.taskId.slice(0, 8)})`;
            const commitRef = await commitExactly(this.runner, root, files, message);
            const committed = recordCommit(item, { commitRef, files }, this.now());
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
            return this.updateByRef(agent, taskId, revision, item => pause(item, this.now()));
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
            return this.updateByRef(agent, taskId, revision, item => setMode(item, mode, this.now()));
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
            return this.updateByRef(agent, taskId, revision, item => approve(item, decision, this.now()));
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
            return this.updateByRef(agent, taskId, revision, item => cancel(item, reason, this.now()));
        }
        /**
         * Ask a human for a scoped decision from the model path.
         * @param agent - live owning Agent.
         * @param reason - concrete reason and proposed recovery.
         * @returns the waiting record.
         */
        async requestApproval(agent, reason) {
            return this.updateCurrent(agent, item => requestApproval(item, reason, this.now()));
        }
        /**
         * Stop a task on an unrecoverable condition from the model path.
         * @param agent - live owning Agent.
         * @param reason - concrete reason and proposed recovery.
         * @returns the blocked record.
         */
        async block(agent, reason) {
            return this.updateCurrent(agent, item => block(item, reason, this.now()));
        }
        /**
         * Switch the current task's mode from the model path.
         * @param agent - live owning Agent.
         * @param mode - requested mode.
         * @returns the paused record with the new mode.
         */
        async updateMode(agent, mode) {
            return this.updateCurrent(agent, item => setMode(item, mode, this.now()));
        }
        /**
         * Pause the current task from the model path.
         * @param agent - live owning Agent.
         * @returns the paused record.
         */
        async pauseCurrent(agent) {
            return this.updateCurrent(agent, item => pause(item, this.now()));
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
            return this.updateCurrent(agent, item => cancel(item, reason, this.now()));
        }
        /** Run one planned command through the composed shell and its sandbox policy. */
        async runSandboxed(agent, root, command, options, callId) {
            const standing = this.ctx.sandboxPolicy.resolve({ session: agent.session });
            let policy = standing;
            if (standing.mode === 'read-only') {
                if (callId === undefined) {
                    throw new WorkflowError('A live tool call id is required for sandbox approval', 'WORKFLOW_APPROVAL_REQUIRED');
                }
                policy = {
                    ...standing,
                    mode: await approveEscalation({
                        requestedMode: 'workspace-write',
                        effectiveMode: standing.mode,
                        justification: 'Run the planned test/build command within the task workspace',
                        subject: 'command',
                    }, {
                        approver: this.ctx.get('approval'),
                        agent,
                        callId,
                        toolName: 'coding_workflow',
                        ...options.signal === undefined ? {} : { signal: options.signal },
                    }),
                };
            }
            try {
                const execution = await this.ctx.shell.execute(this.ctx.shell.resolve({
                    command: command.map(argument => quoteShellArgument(argument)).join(' '),
                    workdir: root,
                    ...options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs },
                    ...options.signal === undefined ? {} : { signal: options.signal },
                    sandboxPolicy: policy,
                }));
                const result = await execution.result();
                return {
                    exitCode: result.exitCode,
                    stdout: result.stdout.text,
                    stderr: result.stderr.text,
                    error: result.aborted ? 'verification command was aborted' : '',
                };
            }
            catch (error) {
                return { exitCode: null, stdout: '', stderr: '', error: error instanceof Error ? error.message : String(error) };
            }
        }
        /** Current Session record or a definite error. */
        requireCurrent(agent) {
            this.assertLive(agent);
            const item = this.getCurrent(agent);
            if (item === null)
                throw new WorkflowError('No current Work Item; start one first', 'WORKFLOW_NO_TASK');
            return item;
        }
        /** Current Session record without the liveness error path. */
        getCurrent(agent) {
            const owned = [...this.requireTable().entries()]
                .map(([, item]) => item)
                .filter(item => item.sessionId === agent.session.id)
                .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
            return owned.find(item => !['completed', 'cancelled'].includes(item.status)) ?? null;
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
            if (item === undefined || item.sessionId !== agent.session.id) {
                throw new WorkflowError('Work Item not found for this Session', 'WORKFLOW_NOT_FOUND');
            }
            if (item.revision !== revision) {
                throw new WorkflowError('Work Item changed concurrently; refresh and retry', 'WORKFLOW_STALE_REVISION');
            }
            return item;
        }
        /** Durably store one computed revision and publish it. */
        async save(agent, item) {
            this.assertLive(agent);
            const stored = await this.requireTable().update(item.taskId, (current) => {
                if (current.revision + 1 !== item.revision) {
                    throw new WorkflowError('Work Item changed concurrently; refresh and retry', 'WORKFLOW_STALE_REVISION');
                }
                return item;
            });
            this.publish(stored);
            return stored;
        }
        /** Publish one accepted mutation to the Host and its Client subscribers. */
        publish(item) {
            this.ctx.emit('coding-workflow/changed', {
                sessionId: item.sessionId,
                taskId: item.taskId,
                revision: item.revision,
                status: item.status,
                currentStage: item.currentStage,
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
            if (this.ctx.agents.get(agent.id) !== agent) {
                throw new WorkflowError(`agent "${agent.id}" is not live in this registry`, 'WORKFLOW_AGENT_NOT_LIVE');
            }
        }
        /** Current ISO-8601 time. */
        now() {
            return new Date().toISOString();
        }
        /** The opened table or a definite startup error. */
        requireTable() {
            if (this.table === undefined)
                throw new Error('coding-workflow is not started yet');
            return this.table;
        }
    };
})();
export { CodingWorkflowService };
export default CodingWorkflowService;
//# sourceMappingURL=index.js.map