/**
 * Browser-hosted Agent runtime.
 *
 * This entry deliberately accepts only a host-provided `AgentModel`. It does
 * not import Cline provider configuration or expose API-key, base-URL, Hub,
 * filesystem, shell, MCP, storage, or team-agent facilities.
 */
export type {
	AgentAfterToolResult,
	AgentBeforeModelResult,
	AgentBeforeToolResult,
	AgentMessage,
	AgentMessagePart,
	AgentModel,
	AgentModelEvent,
	AgentModelFinishReason,
	AgentModelRequest,
	AgentRunResult,
	AgentRuntimeEvent,
	AgentRuntimeHooks,
	AgentRuntimePlugin,
	AgentRuntimeStateSnapshot,
	AgentStopControl,
	AgentTool,
	AgentToolCallPart,
	AgentToolContext,
	AgentToolDefinition,
	AgentToolResult,
	AgentUsage,
	ToolApprovalResult,
	ToolApprovalRequest,
	ToolPolicy,
} from "@cline/shared";
export { createTool } from "@cline/shared";
export type {
	AgentEventListener,
	AgentRunInput,
	AgentRuntimeConfig,
} from "./hosted-agent-runtime";
export {
	Agent,
	AgentRuntime,
	AgentRuntimeAbortError,
	createAgent,
	createAgentRuntime,
} from "./hosted-agent-runtime";
