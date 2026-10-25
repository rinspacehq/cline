import {
	AgentRuntime as ClineAgentRuntime,
	type AgentRuntimeConfig,
} from "@cline/agents/browser-host";
import type {
	AgentBeforeToolResult,
	AgentRuntimeHooks,
	AgentTool,
	ToolPolicy,
} from "@cline/agents/browser-host";

export type {
	AgentMessage,
	AgentMessagePart,
	AgentModel,
	AgentModelEvent,
	AgentModelFinishReason,
	AgentModelRequest,
	AgentRunResult,
	AgentRuntimeEvent,
	AgentRuntimeStateSnapshot,
	AgentTool,
	AgentToolContext,
	AgentToolDefinition,
	AgentToolResult,
	AgentUsage,
	ToolApprovalRequest,
	ToolApprovalResult,
	ToolPolicy,
} from "@cline/agents/browser-host";
export { AgentRuntimeAbortError, createTool } from "@cline/agents/browser-host";

export interface BrowserAgentRuntimeConfig
	extends Omit<AgentRuntimeConfig, "hooks" | "toolPolicies"> {
	/** Named policies are opt-in. The wildcard policy is always forced off. */
	toolPolicies?: Readonly<Record<string, Readonly<ToolPolicy>>>;
	hooks?: AgentRuntimeHooks;
}

function assertUniqueTools(tools: readonly AgentTool[]): Map<string, AgentTool> {
	const allowed = new Map<string, AgentTool>();
	for (const tool of tools) {
		if (allowed.has(tool.name)) {
			throw new Error(`Duplicate tool name is not allowed: ${tool.name}`);
		}
		allowed.set(tool.name, tool);
	}
	return allowed;
}

function createPolicies(
	tools: ReadonlyMap<string, AgentTool>,
	policies: BrowserAgentRuntimeConfig["toolPolicies"],
): Record<string, ToolPolicy> {
	if (policies?.["*"] !== undefined) {
		throw new Error('The "*" tool policy is owned by cline-embed');
	}
	const resolved: Record<string, ToolPolicy> = {
		"*": { enabled: false, autoApprove: false },
	};
	for (const [name, policy] of Object.entries(policies ?? {})) {
		if (!tools.has(name)) {
			throw new Error(`Tool policy references an unknown tool: ${name}`);
		}
		resolved[name] = {
			enabled: policy.enabled === true,
			autoApprove: policy.autoApprove === true,
		};
	}
	return resolved;
}

function composeBeforeTool(
	allowedTools: ReadonlyMap<string, AgentTool>,
	hostHook: AgentRuntimeHooks["beforeTool"],
): NonNullable<AgentRuntimeHooks["beforeTool"]> {
	return async (context): Promise<AgentBeforeToolResult | undefined> => {
		if (allowedTools.get(context.tool.name) !== context.tool) {
			return {
				skip: true,
				reason: `Tool ${context.tool.name} was not registered by the host`,
			};
		}
		return hostHook?.(context);
	};
}

/**
 * Browser-only Cline runtime with a deny-by-default tool boundary.
 *
 * The constructor accepts only a host-provided model. Provider identifiers,
 * API keys, custom URLs and headers are intentionally absent from the type and
 * runtime surface.
 */
export class AgentRuntime extends ClineAgentRuntime {
	constructor(config: BrowserAgentRuntimeConfig) {
		const allowedTools = assertUniqueTools(config.tools ?? []);
		const { hooks, toolPolicies, ...runtimeConfig } = config;
		super({
			...runtimeConfig,
			hooks: {
				...hooks,
				beforeTool: composeBeforeTool(allowedTools, hooks?.beforeTool),
			},
			toolPolicies: createPolicies(allowedTools, toolPolicies),
		});
	}
}

export const Agent = AgentRuntime;
export type Agent = AgentRuntime;

export function createAgentRuntime(
	config: BrowserAgentRuntimeConfig,
): AgentRuntime {
	return new AgentRuntime(config);
}

export const createAgent = createAgentRuntime;
