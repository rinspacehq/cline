import { describe, expect, it } from "vitest";
import {
	classifyProviderError,
	isRetryableProviderError,
} from "./error-classification.browser";

describe("browser provider error classification", () => {
	it("classifies structured auth and context errors", () => {
		expect(classifyProviderError({ status: 401, message: "unauthorized" })).toBe(
			"auth",
		);
		expect(
			classifyProviderError({
				statusCode: 400,
				data: { code: "context_length_exceeded" },
			}),
		).toBe("context_window_exceeded");
	});

	it("honors retryability without importing provider implementations", () => {
		expect(isRetryableProviderError({ status: 503 })).toBe(true);
		expect(isRetryableProviderError({ status: 400 })).toBe(false);
		expect(isRetryableProviderError({ isRetryable: true })).toBe(true);
		expect(isRetryableProviderError("Provider returned error")).toBe(true);
	});
});
