import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
	args.set(process.argv[index], process.argv[index + 1]);
}

const outputDir = resolve(args.get("--output") ?? "");
const packageArtifact = resolve(args.get("--package") ?? "");
const sourceArtifact = resolve(args.get("--source") ?? "");
const tag = args.get("--tag") ?? "";
if (!outputDir || !packageArtifact || !sourceArtifact || !tag) {
	throw new Error(
		"usage: node package-cline-embed-release.mjs --output DIR --package TGZ --source TGZ --tag TAG",
	);
}

const packageJson = JSON.parse(
	await readFile("sdk/packages/cline-embed/package.json", "utf8"),
);
if (tag !== `v${packageJson.version}`) {
	throw new Error(`tag ${tag} does not match package version ${packageJson.version}`);
}

await mkdir(outputDir, { recursive: true });

async function describe(path) {
	const bytes = await readFile(path);
	return {
		name: basename(path),
		sha256: createHash("sha256").update(bytes).digest("hex"),
		size: (await stat(path)).size,
	};
}

const packageFile = await describe(packageArtifact);
const sourceFile = await describe(sourceArtifact);
const repository = process.env.GITHUB_REPOSITORY ?? "rinspacehq/cline";
const commit = process.env.GITHUB_SHA ?? "unknown";
const runId = process.env.GITHUB_RUN_ID ?? "local";
const created = new Date(
	Number(process.env.SOURCE_DATE_EPOCH ?? "0") * 1000,
).toISOString();

const manifest = {
	schemaVersion: 1,
	name: packageJson.name,
	version: packageJson.version,
	tag,
	repository: `https://github.com/${repository}`,
	commit,
	upstreamBaseline: "c718573538d76310f464541617ab665108a6c999",
	upstreamTag: "sdk/agents/v0.0.95",
	license: "Apache-2.0",
	artifacts: [packageFile, sourceFile],
	browserBoundary: {
		model: "host-provided",
		toolPolicy: "default-deny",
		forbidden: [
			"@cline/core",
			"node built-ins",
			"filesystem",
			"shell",
			"sqlite",
			"hub",
			"mcp",
			"team agents",
			"vendor credentials",
		],
	},
};

const sbom = {
	spdxVersion: "SPDX-2.3",
	dataLicense: "CC0-1.0",
	SPDXID: "SPDXRef-DOCUMENT",
	name: `${packageJson.name}-${packageJson.version}`,
	documentNamespace: `https://github.com/${repository}/releases/tag/${tag}/sbom`,
	creationInfo: {
		created,
		creators: ["Tool: rinspace-cline-release/1"],
	},
	packages: [
		{
			name: packageJson.name,
			SPDXID: "SPDXRef-Package-cline-embed",
			versionInfo: packageJson.version,
			downloadLocation: `https://github.com/${repository}/releases/download/${tag}/${packageFile.name}`,
			filesAnalyzed: false,
			licenseConcluded: "Apache-2.0",
			licenseDeclared: "Apache-2.0",
			checksums: [{ algorithm: "SHA256", checksumValue: packageFile.sha256 }],
			externalRefs: [
				{
					referenceCategory: "PACKAGE-MANAGER",
					referenceType: "purl",
					referenceLocator: `pkg:npm/%40rinspacehq/cline-embed@${packageJson.version}`,
				},
			],
		},
	],
	relationships: [
		{
			spdxElementId: "SPDXRef-DOCUMENT",
			relationshipType: "DESCRIBES",
			relatedSpdxElement: "SPDXRef-Package-cline-embed",
		},
	],
};

const provenance = {
	_type: "https://in-toto.io/Statement/v1",
	subject: [packageFile, sourceFile].map((artifact) => ({
		name: artifact.name,
		digest: { sha256: artifact.sha256 },
	})),
	predicateType: "https://slsa.dev/provenance/v1",
	predicate: {
		buildDefinition: {
			buildType: "https://github.com/rinspacehq/cline/rinspace-cline-embed-release/v1",
			externalParameters: { tag },
			internalParameters: { repository, commit },
			resolvedDependencies: [
				{
					uri: "git+https://github.com/cline/cline",
					digest: { gitCommit: manifest.upstreamBaseline },
				},
			],
		},
		runDetails: {
			builder: {
				id: `https://github.com/${repository}/actions/runs/${runId}`,
			},
			metadata: { invocationId: runId },
		},
	},
};

const jsonFiles = [
	["manifest.json", manifest],
	["sbom.spdx.json", sbom],
	["provenance.intoto.json", provenance],
];
for (const [name, value] of jsonFiles) {
	await writeFile(join(outputDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

const checksumTargets = [
	packageArtifact,
	sourceArtifact,
	join(outputDir, "LICENSE"),
	join(outputDir, "NOTICE"),
	...jsonFiles.map(([name]) => join(outputDir, name)),
];
const checksums = await Promise.all(checksumTargets.map(describe));
await writeFile(
	join(outputDir, "SHA256SUMS"),
	`${checksums.map((entry) => `${entry.sha256}  ${entry.name}`).join("\n")}\n`,
);
