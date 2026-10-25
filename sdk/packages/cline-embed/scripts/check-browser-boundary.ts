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
	if (!path.endsWith(".js")) continue;
	const text = await readFile(path, "utf8");
	for (const token of forbiddenArtifactBytes) {
		if (text.includes(token)) {
			throw new Error(`${relative(root, path)} contains forbidden ${token}`);
		}
	}
}
