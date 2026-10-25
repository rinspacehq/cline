import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
		pool: "forks",
		poolOptions: { forks: { singleFork: true } },
	},
});
