import { createRoot } from "react-dom/client";
import { type AgentModel, AgentRuntime } from "../dist/index.js";
import {
	AgentApprovalCard,
	AgentDiffFile,
	AgentDiffPanel,
	AgentMessageList,
	AgentToolView,
} from "../dist/ui.js";

const model: AgentModel = {
	async stream() {
		return (async function* () {
			yield { type: "text-delta" as const, text: "Browser runtime ready" };
			yield { type: "finish" as const, reason: "stop" as const };
		})();
	},
};

const result = await new AgentRuntime({ model }).run("Browser smoke test");
const rootElement = document.querySelector("[data-agent-root]");
if (!(rootElement instanceof HTMLElement)) {
	throw new Error("Missing example root element");
}

createRoot(rootElement).render(
	<div className="rinspace-cline-embed">
		<AgentMessageList
			messages={[
				{ id: "assistant-1", role: "assistant", content: result.outputText },
			]}
		/>
		<AgentToolView label="Compile project" status="success">
			<span>Compilation completed</span>
		</AgentToolView>
		<AgentApprovalCard
			description="Push one commit to the reviewed target"
			detail="rinspace/example → main"
			onApprove={() => {
				document.documentElement.dataset.approval = "approved";
			}}
			onReject={() => {
				document.documentElement.dataset.approval = "rejected";
			}}
			title="Approve Push"
		/>
		<AgentDiffPanel fileCount={1} onClose={() => {}} title="Agent changes">
			<AgentDiffFile
				additions={1}
				deletions={0}
				onCopyPath={() => {}}
				path="paper.tex"
			>
				<pre>+ Browser-safe change</pre>
			</AgentDiffFile>
		</AgentDiffPanel>
	</div>,
);
document.documentElement.dataset.agentStatus = result.status;
