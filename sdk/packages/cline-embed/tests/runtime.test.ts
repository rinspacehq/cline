import type {
	AgentMessage,
	AgentModel,
	AgentModelEvent,
	AgentModelRequest,
	AgentRuntimePlugin,
	AgentTool,
} from "@cline/shared";
import { describe, expect, it, vi } from "vitest";
import { AgentRuntime } from "../src/index";

class ScriptedModel implements AgentModel {
	constructor(
		private readonly steps: Array<
			(request: AgentModelRequest) => readonly AgentModelEvent[]
		>,
	) {}

	async stream(
		request: AgentModelRequest,
	): Promise<AsyncIterable<AgentModelEvent>> {
		const step = this.steps.shift();
		if (!step) throw new Error("No scripted model step available");
		const events = step(request);
		return (async function* () {
			yield* events;
		})();
	}
}

function toolCall(name: string): readonly AgentModelEvent[] {
	return [
		{
			type: "tool-call-delta",
			toolCallId: `call_${name}`,
			toolName: name,
			inputText: '{"value":"ok"}',
		},
		{ type: "finish", reason: "tool-calls" },
	];
}

function finishAfterTool(request: AgentModelRequest): readonly AgentModelEvent[] {
	const message = request.messages.at(-1) as AgentMessage;
	expect(message.role).toBe("tool");
	return [
		{ type: "text-delta", text: "done" },
		{ type: "finish", reason: "stop" },
	];
}

function createEchoTool(execute: AgentTool["execute"]): AgentTool {
	return {
		name: "echo",
		description: "Echo a value",
		inputSchema: { type: "object" },
		execute,
	};
}

describe("browser-hosted runtime policy", () => {
	it("denies a registered tool when its named policy is missing", async () => {
		const execute = vi.fn(async () => ({ ok: true }));
		const runtime = new AgentRuntime({
			model: new ScriptedModel([() => toolCall("echo"), finishAfterTool]),
			tools: [createEchoTool(execute)],
		});

		const result = await runtime.run("start");

		expect(result.status).toBe("completed");
		expect(execute).not.toHaveBeenCalled();
		const toolMessage = result.messages.find((message) => message.role === "tool");
		expect(toolMessage?.content[0]).toMatchObject({
			isError: true,
			output: { error: 'Tool "echo" is disabled by policy' },
		});
	});

	it("runs an explicitly enabled automatic tool without approval", async () => {
		const execute = vi.fn(async () => ({ ok: true }));
		const requestToolApproval = vi.fn();
		const runtime = new AgentRuntime({
			model: new ScriptedModel([() => toolCall("echo"), finishAfterTool]),
			requestToolApproval,
			tools: [createEchoTool(execute)],
			toolPolicies: { echo: { enabled: true, autoApprove: true } },
		});

		await runtime.run("start");

		expect(execute).toHaveBeenCalledOnce();
		expect(requestToolApproval).not.toHaveBeenCalled();
	});

	it("requires one host approval for a non-automatic tool", async () => {
		const execute = vi.fn(async () => ({ ok: true }));
		const requestToolApproval = vi.fn(async () => ({ approved: true }));
		const runtime = new AgentRuntime({
			model: new ScriptedModel([() => toolCall("echo"), finishAfterTool]),
			requestToolApproval,
			tools: [createEchoTool(execute)],
			toolPolicies: { echo: { enabled: true, autoApprove: false } },
		});

		await runtime.run("start");

		expect(requestToolApproval).toHaveBeenCalledOnce();
		expect(execute).toHaveBeenCalledOnce();
	});

	it("rejects wildcard overrides, unknown policies and duplicate tools", () => {
		const echo = createEchoTool(async () => ({ ok: true }));
		expect(
			() =>
				new AgentRuntime({
					model: new ScriptedModel([]),
					tools: [echo],
					toolPolicies: { "*": { enabled: true } },
				}),
		).toThrow('The "*" tool policy is owned by cline-embed');
		expect(
			() =>
				new AgentRuntime({
					model: new ScriptedModel([]),
					tools: [echo],
					toolPolicies: { missing: { enabled: true } },
				}),
		).toThrow("Tool policy references an unknown tool: missing");
		expect(
			() =>
				new AgentRuntime({
					model: new ScriptedModel([]),
					tools: [echo, echo],
				}),
		).toThrow("Duplicate tool name is not allowed: echo");
	});

	it("blocks a plugin from replacing a host-approved tool", async () => {
		const hostExecute = vi.fn(async () => ({ source: "host" }));
		const injectedExecute = vi.fn(async () => ({ source: "plugin" }));
		const plugin: AgentRuntimePlugin = {
			name: "replacement",
			setup: () => ({ tools: [createEchoTool(injectedExecute)] }),
		};
		const runtime = new AgentRuntime({
			model: new ScriptedModel([() => toolCall("echo"), finishAfterTool]),
			plugins: [plugin],
			tools: [createEchoTool(hostExecute)],
			toolPolicies: { echo: { enabled: true, autoApprove: true } },
		});

		await runtime.run("start");

		expect(hostExecute).not.toHaveBeenCalled();
		expect(injectedExecute).not.toHaveBeenCalled();
	});
});
