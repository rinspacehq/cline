/**
 * Self-contained browser host contract for @rinspacehq/cline-embed.
 *
 * Keep this file free of @cline/* imports.  The release archive intentionally
 * contains one browser bundle rather than the unpublished SDK workspace, so
 * consumers must be able to type-check the public surface from this package
 * alone.
 */

export interface AgentTextPart {
	type: "text";
	text: string;
}

export interface AgentReasoningPart {
	type: "reasoning";
	text: string;
	redacted?: boolean;
	metadata?: unknown;
}

export interface AgentImagePart {
	type: "image";
	image: string | Uint8Array | ArrayBuffer | URL;
	mediaType?: string;
}

export interface AgentFilePart {
	type: "file";
	path: string;
	content: string;
}

export interface AgentMediaPart {
	type: "media";
	media: unknown;
}

export interface AgentToolCallPart {
	type: "tool-call";
	toolCallId: string;
	toolName: string;
	input: unknown;
	metadata?: unknown;
	execution?: "client" | "provider";
}

export interface AgentToolResultPart {
	type: "tool-result";
	toolCallId: string;
	toolName: string;
	output: unknown;
	isError?: boolean;
	execution?: "client" | "provider";
}

export type AgentMessagePart =
	| AgentTextPart
	| AgentReasoningPart
	| AgentImagePart
	| AgentFilePart
	| AgentMediaPart
	| AgentToolCallPart
	| AgentToolResultPart;

export interface AgentTokenUsage {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	reasoningTokenCount?: number;
}

export interface AgentUsage extends AgentTokenUsage {
	totalCost?: number;
}

export interface AgentMessage {
	id: string;
	role: "user" | "assistant" | "tool";
	content: AgentMessagePart[];
	createdAt: number;
	metadata?: Record<string, unknown>;
	modelInfo?: { id: string; provider: string; family?: string };
	metrics?: AgentTokenUsage & { cost?: number };
}

export type AgentRunStatus =
	| "idle"
	| "running"
	| "completed"
	| "aborted"
	| "failed";

export interface AgentRuntimeStateSnapshot {
	agentId: string;
	agentRole?: string;
	parentAgentId?: string | null;
	conversationId?: string;
	runId?: string;
	status: AgentRunStatus;
	iteration: number;
	messages: readonly AgentMessage[];
	pendingToolCalls: readonly string[];
	usage: AgentUsage;
	lastError?: string;
	lastErrorClass?: ProviderErrorClass;
}

export interface AgentToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	resultPolicy?: "cache-oversized";
	lifecycle?: { completesRun?: boolean };
}

export interface AgentToolResult<TOutput = unknown> {
	output: TOutput;
	isError?: boolean;
	metadata?: Record<string, unknown>;
}

export interface AgentToolContext {
	sessionId?: string;
	agentId: string;
	conversationId?: string;
	runId?: string;
	iteration: number;
	toolCallId?: string;
	signal?: AbortSignal;
	metadata?: Record<string, unknown>;
	snapshot?: AgentRuntimeStateSnapshot;
	emitUpdate?: (update: unknown) => void;
}

export interface AgentTool<TInput = unknown, TOutput = unknown>
	extends AgentToolDefinition {
	executionMode?: "sequential" | "parallel";
	timeoutMs?: number;
	retryable?: boolean;
	maxRetries?: number;
	execute: (
		input: TInput,
		context: AgentToolContext,
	) => Promise<TOutput> | TOutput;
}

export interface ToolPolicy {
	enabled?: boolean;
	autoApprove?: boolean;
}

export interface ToolApprovalRequest {
	sessionId: string;
	agentId: string;
	conversationId: string;
	iteration: number;
	toolCallId: string;
	toolName: string;
	input: unknown;
	policy: ToolPolicy;
}

export interface ToolApprovalResult {
	approved: boolean;
	reason?: string;
}

export type AgentModelFinishReason =
	| "unknown"
	| "stop"
	| "tool-calls"
	| "max-tokens"
	| "content-filter"
	| "aborted"
	| "error";

export type ProviderErrorClass = "context_window_exceeded" | "auth" | "unknown";

export type AgentModelEvent =
	| { type: "text-delta"; text: string }
	| {
			type: "reasoning-delta";
			text: string;
			redacted?: boolean;
			metadata?: unknown;
	  }
	| { type: "media"; media: unknown }
	| {
			type: "tool-call-delta";
			index?: number;
			toolCallId?: string;
			toolName?: string;
			inputText?: string;
			input?: unknown;
			metadata?: unknown;
			execution?: "client" | "provider";
	  }
	| {
			type: "tool-result";
			toolCallId: string;
			toolName: string;
			input?: unknown;
			output: unknown;
			isError?: boolean;
			execution: "client" | "provider";
	  }
	| { type: "usage"; usage: Partial<AgentUsage> }
	| {
			type: "finish";
			reason: AgentModelFinishReason;
			requestId?: string;
			error?: string;
			errorClass?: ProviderErrorClass;
			errorRetryable?: boolean;
			errorReported?: boolean;
	  };

export interface AgentModelRequest {
	systemPrompt?: string;
	messages: readonly AgentMessage[];
	tools: readonly AgentToolDefinition[];
	signal?: AbortSignal;
	options?: Record<string, unknown>;
}

export interface AgentModel {
	stream: (
		request: AgentModelRequest,
	) => AsyncIterable<AgentModelEvent> | Promise<AsyncIterable<AgentModelEvent>>;
}

export interface AgentBeforeToolContext {
	snapshot: AgentRuntimeStateSnapshot;
	tool: AgentTool;
	toolCall: AgentToolCallPart;
	input: unknown;
}

export interface AgentBeforeToolResult {
	skip?: boolean;
	stop?: boolean;
	reason?: string;
	input?: unknown;
	policy?: ToolPolicy;
	appendContext?: string;
}

export interface AgentAfterToolContext extends AgentBeforeToolContext {
	result: AgentToolResult;
	startedAt: Date;
	endedAt: Date;
	durationMs: number;
}

export interface AgentAfterToolResult {
	stop?: boolean;
	reason?: string;
	result?: AgentToolResult;
	appendContext?: string;
}

export interface AgentRuntimeHooks {
	beforeTool?: (
		context: AgentBeforeToolContext,
	) =>
		| AgentBeforeToolResult
		| undefined
		| Promise<AgentBeforeToolResult | undefined>;
	afterTool?: (
		context: AgentAfterToolContext,
	) =>
		| AgentAfterToolResult
		| undefined
		| Promise<AgentAfterToolResult | undefined>;
	onEvent?: (event: AgentRuntimeEvent) => void | Promise<void>;
}

export interface AgentRuntimePluginContext {
	agentId: string;
	agentRole?: string;
	systemPrompt?: string;
}

export interface AgentRuntimePluginSetup {
	tools?: readonly AgentTool[];
	hooks?: Partial<AgentRuntimeHooks>;
}

export interface AgentRuntimePlugin {
	name: string;
	setup?: (
		context: AgentRuntimePluginContext,
	) =>
		| AgentRuntimePluginSetup
		| undefined
		| Promise<AgentRuntimePluginSetup | undefined>;
}

export type AgentRunInput = string | AgentMessage | readonly AgentMessage[];

export interface AgentRunResult {
	agentId: string;
	agentRole?: string;
	runId: string;
	status: "completed" | "aborted" | "failed";
	iterations: number;
	outputText: string;
	messages: readonly AgentMessage[];
	usage: AgentUsage;
	error?: Error;
}

export type AgentRuntimeEvent =
	| {
			type: "run-started" | "turn-started" | "turn-finished";
			snapshot: AgentRuntimeStateSnapshot;
			iteration?: number;
			toolCallCount?: number;
	  }
	| {
			type: "message-added" | "assistant-message" | "tool-finished";
			snapshot: AgentRuntimeStateSnapshot;
			message: AgentMessage;
			iteration?: number;
			toolCall?: AgentToolCallPart;
			finishReason?: AgentModelFinishReason;
	  }
	| {
			type: "assistant-text-delta" | "assistant-reasoning-delta";
			snapshot: AgentRuntimeStateSnapshot;
			iteration: number;
			text: string;
			accumulatedText: string;
			redacted?: boolean;
			metadata?: unknown;
	  }
	| {
			type: "tool-started" | "tool-updated";
			snapshot: AgentRuntimeStateSnapshot;
			iteration: number;
			toolCall: AgentToolCallPart;
			update?: unknown;
	  }
	| {
			type: "usage-updated";
			snapshot: AgentRuntimeStateSnapshot;
			usage: AgentUsage;
	  }
	| {
			type: "status-notice";
			snapshot: AgentRuntimeStateSnapshot;
			message: string;
			metadata?: Record<string, unknown>;
	  }
	| {
			type: "run-finished";
			snapshot: AgentRuntimeStateSnapshot;
			result: AgentRunResult;
	  }
	| {
			type: "run-failed";
			snapshot: AgentRuntimeStateSnapshot;
			error: Error;
			errorClass?: ProviderErrorClass;
	  }
	| {
			type: "assistant-media";
			snapshot: AgentRuntimeStateSnapshot;
			iteration: number;
			media: unknown;
	  };

export type AgentEventListener = (event: AgentRuntimeEvent) => void;

export interface BrowserAgentRuntimeConfig {
	model: AgentModel;
	sessionId?: string;
	agentId?: string;
	conversationId?: string;
	parentAgentId?: string | null;
	agentRole?: string;
	systemPrompt?: string;
	messageModelInfo?: AgentMessage["modelInfo"];
	modelOptions?: Record<string, unknown>;
	tools?: readonly AgentTool[];
	hooks?: Partial<AgentRuntimeHooks>;
	plugins?: readonly AgentRuntimePlugin[];
	initialMessages?: readonly AgentMessage[];
	maxIterations?: number;
	toolExecution?: "sequential" | "parallel";
	toolPolicies?: Readonly<Record<string, Readonly<ToolPolicy>>>;
	toolContextMetadata?: Record<string, unknown>;
	requestToolApproval?: (
		request: ToolApprovalRequest,
	) => Promise<ToolApprovalResult> | ToolApprovalResult;
	consumePendingUserMessage?: () =>
		| string
		| undefined
		| Promise<string | undefined>;
}

export interface CreateToolConfig<TInput, TOutput> {
	name: string;
	resultPolicy?: AgentTool["resultPolicy"];
	description: string;
	inputSchema: Record<string, unknown>;
	execute: (input: TInput, context: AgentToolContext) => Promise<TOutput>;
	lifecycle?: AgentTool<TInput, TOutput>["lifecycle"];
	executionMode?: AgentTool["executionMode"];
	timeoutMs?: number;
	retryable?: boolean;
	maxRetries?: number;
}
