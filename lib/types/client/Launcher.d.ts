import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { LauncherInjected } from './index.ts';
type Props = PropsRuntime<'conversation.input.dock'> & PropsLocale<'mattSkillLauncher'> & InjectFace<LauncherInjected>;
export declare function Launcher({ useInput, useConversation, useSession, useProjection, inputActions, useActionForm, fetchSkillNames, useWorkflow, workflowCommands, pauseWorkflow, resumeWorkflow, saveLayout, todoStaleMs, t, }: Props): import("react").JSX.Element;
export {};
