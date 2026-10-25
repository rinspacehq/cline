import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const forbiddenSourceImports = [
	"@cline/core",
	"node:fs",
	"node:child_process",
	"better-sqlite3",
];
const forbiddenArtifactBytes = [
	"@cline/core",
	"node:child_process",
	"better-sqlite3",
	"CLINE_API_KEY",
	"ANTHROPIC_API_KEY",
	"OPENROUTER_API_KEY",
	"createSpawnAgentTool",
	"AgentTeamsRuntime",
];
const forbiddenDeclarationImports = ["@cline/agents", "@cline/shared", "@cline/ui"];

async function filesUnder(directory: string): Promise<string[]> {
	const result: string[] = [];
	for (const entry of await readdir(directory)) {
		const path = join(directory, entry);
		if ((await stat(path)).isDirectory()) {
			result.push(...(await filesUnder(path)));
		} else {
			result.push(path);
		}
	}
	return result;
}

for (const path of await filesUnder(join(root, "src"))) {
	const text = await readFile(path, "utf8");
	for (const token of forbiddenSourceImports) {
		if (text.includes(token)) {
			throw new Error(`${relative(root, path)} imports forbidden ${token}`);
		}
	}
}

for (const path of await filesUnder(join(root, "dist"))) {
	const text = await readFile(path, "utf8");
	if (path.endsWith(".js")) {
		for (const token of forbiddenArtifactBytes) {
			if (text.includes(token)) {
				throw new Error(`${relative(root, path)} contains forbidden ${token}`);
			}
		}
	}
	if (path.endsWith(".d.ts")) {
		for (const token of forbiddenDeclarationImports) {
			if (text.includes(token)) {
				throw new Error(
					`${relative(root, path)} exposes unpublished declaration ${token}`,
				);
			}
		}
	}
}

const publicDeclaration = await readFile(join(root, "dist/index.d.ts"), "utf8");
for (const signature of [
	"run(input: AgentRunInput)",
	"abort(reason?: unknown)",
	"subscribe(listener: AgentEventListener)",
	"restore(messages?:",
	"snapshot(): AgentRuntimeStateSnapshot",
]) {
	if (!publicDeclaration.includes(signature)) {
		throw new Error(`dist/index.d.ts is missing public runtime signature ${signature}`);
	}
}
