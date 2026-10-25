/// <reference types="@types/bun" />
export {};

// This package is an immutable browser artifact, not a development-server
// bundle. Bun otherwise selects react/jsx-dev-runtime when NODE_ENV is absent;
// React intentionally exports an undefined jsxDEV function from that entry in
// production, so downstream production bundlers can build a chunk that fails
// only when one of the lazy UI exports mounts.
process.env.NODE_ENV = "production";

const result = await Bun.build({
	entrypoints: ["./src/index.ts", "./src/ui.tsx"],
	outdir: "./dist",
	target: "browser",
	format: "esm",
	minify: true,
	sourcemap: "none",
	packages: "bundle",
	define: { "process.env.NODE_ENV": JSON.stringify("production") },
	external: ["react", "react/jsx-runtime"],
});

for (const log of result.logs) {
	console.warn(log);
}

if (!result.success) {
	throw new Error("Failed to build @rinspacehq/cline-embed");
}
