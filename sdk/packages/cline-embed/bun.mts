/// <reference types="@types/bun" />
export {};

const result = await Bun.build({
	entrypoints: ["./src/index.ts", "./src/ui.tsx"],
	outdir: "./dist",
	target: "browser",
	format: "esm",
	minify: true,
	sourcemap: "none",
	packages: "bundle",
	external: ["react", "react/jsx-runtime"],
});

for (const log of result.logs) {
	console.warn(log);
}

if (!result.success) {
	throw new Error("Failed to build @rinspacehq/cline-embed");
}
