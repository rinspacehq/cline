import { type AgentModel, AgentRuntime } from "../src/index";

const model: AgentModel = {
	async stream() {
		return (async function* () {
			yield { type: "text-delta" as const, text: "Browser runtime ready" };
			yield { type: "finish" as const, reason: "stop" as const };
		})();
	},
};

const result = await new AgentRuntime({ model }).run("Browser smoke test");
const output = document.querySelector("[data-agent-output]");
if (!(output instanceof HTMLElement)) {
	throw new Error("Missing example output element");
}
output.textContent = result.outputText;
document.documentElement.dataset.agentStatus = result.status;
