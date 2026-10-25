import {
	AgentRuntime as ClineAgentRuntime,
	AgentRuntimeAbortError as ClineAgentRuntimeAbortError,
	createTool as createClineTool,
} from "@cline/agents/browser-host";
import type {
	AgentBeforeToolResult,
	AgentEventListener,
	AgentRunInput,
	AgentRunResult,
	AgentRuntimeHooks,
	AgentRuntimeStateSnapshot,
	AgentTool,
	BrowserAgentRuntimeConfig,
	CreateToolConfig,
	ToolPolicy,
} from "./contract";

export type * from "./contract";

function assertUniqueTools(
	tools: readonly AgentTool[],
): Map<string, AgentTool> {
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
export class AgentRuntime {
	readonly #runtime: ClineAgentRuntime;

	constructor(config: BrowserAgentRuntimeConfig) {
		const allowedTools = assertUniqueTools(config.tools ?? []);
		const { hooks, toolPolicies, ...runtimeConfig } = config;
		this.#runtime = new ClineAgentRuntime({
			...runtimeConfig,
			hooks: {
				...hooks,
				beforeTool: composeBeforeTool(allowedTools, hooks?.beforeTool),
			},
			toolPolicies: createPolicies(allowedTools, toolPolicies),
		} as never);
	}

	run(input: AgentRunInput): Promise<AgentRunResult> {
		return this.#runtime.run(input as never) as Promise<AgentRunResult>;
	}

	continue(input?: AgentRunInput): Promise<AgentRunResult> {
		return this.#runtime.continue(input as never) as Promise<AgentRunResult>;
	}

	notifyPendingUserMessage(): void {
		this.#runtime.notifyPendingUserMessage();
	}

	abort(reason?: unknown): void {
		this.#runtime.abort(reason);
	}

	subscribe(listener: AgentEventListener): () => void {
		return this.#runtime.subscribe(listener as never);
	}

	restore(messages: BrowserAgentRuntimeConfig["initialMessages"] = []): void {
		this.#runtime.restore(messages as never);
	}

	snapshot(): AgentRuntimeStateSnapshot {
		return this.#runtime.snapshot() as AgentRuntimeStateSnapshot;
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

export interface AgentRuntimeAbortError extends Error {
	readonly reason?: unknown;
}

export const AgentRuntimeAbortError: new (
	reason?: unknown,
) => AgentRuntimeAbortError = ClineAgentRuntimeAbortError;

export function createTool<TInput, TOutput>(
	config: CreateToolConfig<TInput, TOutput>,
): AgentTool<TInput, TOutput> {
	return createClineTool(config as never) as AgentTool<TInput, TOutput>;
}
