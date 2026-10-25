import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const upstreamBaseline = "c718573538d76310f464541617ab665108a6c999";
const changed = execFileSync(
	"git",
	["diff", "--name-only", "-z", upstreamBaseline, "--"],
	{ encoding: "utf8" },
)
	.split("\0")
	.filter(Boolean);
const untracked = execFileSync(
	"git",
	["ls-files", "--others", "--exclude-standard", "-z"],
	{ encoding: "utf8" },
)
	.split("\0")
	.filter(Boolean);
const files = [...new Set([...changed, ...untracked])];

const forbiddenPaths = [
	/(^|\/)\.env(?:\.|$)/,
	/(^|\/)(secrets?|credentials?)(\/|$)/i,
	/(^|\/)production-snapshots(\/|$)/,
];
const forbiddenContent = [
	/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
	/AKIA[0-9A-Z]{16}/,
	/github_pat_[A-Za-z0-9_]{20,}/,
	/gh[opsu]_[A-Za-z0-9]{30,}/,
];

const failures = [];
for (const file of files) {
	if (forbiddenPaths.some((pattern) => pattern.test(file))) {
		failures.push(`${file}: forbidden sensitive path`);
		continue;
	}
	let content;
	try {
		content = readFileSync(file, "utf8");
	} catch {
		continue;
	}
	if (content.includes("\0")) continue;
	for (const pattern of forbiddenContent) {
		if (pattern.test(content)) {
			failures.push(`${file}: matched ${pattern.source}`);
		}
	}
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exitCode = 1;
}
