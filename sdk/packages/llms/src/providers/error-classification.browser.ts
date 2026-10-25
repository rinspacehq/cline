import { type ProviderErrorClass, safeJsonParse } from "@cline/shared";

const CONTEXT_WINDOW_CODES = new Set(["context_length_exceeded"]);
const CONTEXT_WINDOW_PATTERNS = [
	/\bcontext\s*(?:length|window|limit)\b/i,
	/\bmaximum\s*context\b/i,
	/\b(?:input\s*)?tokens?\s+exceeds?\b/i,
	/\btoo\s*many\s*tokens?\b/i,
	/\binput\s+is\s+too\s+long\b/i,
	/\bprompt\s+is\s+too\s+long\b/i,
	/reduce\s+the\s+length\s+of\s+the\s+messages\s+or\s+completion/i,
	/requested\s+input\s+length\s+.*exceeds\s+.*maximum/i,
];
const RATE_LIMIT_PATTERNS = [/rate[\s_-]?limit/i, /per[\s_-]?minute\b/i];
const CONTEXT_WINDOW_STATUSES = new Set([400, 413, 422]);
const AUTH_STATUSES = new Set([401, 403]);
const RETRYABLE_STATUSES = new Set([
	408,
	409,
	425,
	429,
	500,
	502,
	503,
	504,
	529,
]);
const PROVIDER_RETURNED_ERROR_PATTERN = /provider returned error/i;
const MAX_WALK_DEPTH = 8;
const DETAIL_KEYS = [
	"message",
	"detail",
	"error_message",
	"error",
	"errors",
	"cause",
	"responseBody",
	"data",
	"value",
	"param",
	"lastError",
] as const;
const STATUS_KEYS = ["status", "statusCode", "code"] as const;

interface ErrorSignals {
	messages: string[];
	statuses: Set<number>;
	codes: Set<string>;
	retryable?: boolean;
}

function recordStatus(signals: ErrorSignals, value: unknown): void {
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "string" && /^\d{3}$/.test(value.trim())
				? Number(value.trim())
				: undefined;
	if (numeric !== undefined && numeric >= 100 && numeric <= 599) {
		signals.statuses.add(numeric);
	}
}

function collectSignals(
	value: unknown,
	signals: ErrorSignals,
	visited: Set<unknown>,
	depth: number,
): void {
	if (value == null || depth > MAX_WALK_DEPTH) return;
	if (typeof value === "string") {
		const text = value.trim();
		if (!text) return;
		signals.messages.push(text);
		const parsed = safeJsonParse<unknown>(text);
		if (parsed !== undefined && typeof parsed === "object") {
			collectSignals(parsed, signals, visited, depth + 1);
		} else {
			const embedded = text.match(/"(?:code|status)"\s*:\s*"?(\d{3})"?/);
			if (embedded) recordStatus(signals, embedded[1]);
		}
		return;
	}
	if (typeof value !== "object" || visited.has(value)) return;
	visited.add(value);
	if (Array.isArray(value)) {
		for (const item of value) collectSignals(item, signals, visited, depth + 1);
		return;
	}

	const record = value as Record<string, unknown>;
	if (typeof record.isRetryable === "boolean") {
		signals.retryable = record.isRetryable;
	}
	for (const key of STATUS_KEYS) recordStatus(signals, record[key]);
	for (const key of ["code", "type", "name"]) {
		const candidate = record[key];
		if (typeof candidate === "string" && candidate.trim()) {
			signals.codes.add(candidate.trim());
		}
	}
	for (const key of DETAIL_KEYS) {
		const nested = record[key];
		if (nested !== undefined && nested !== value && typeof nested !== "number") {
			collectSignals(nested, signals, visited, depth + 1);
		}
	}
}

function collectSignalsFrom(error: unknown): ErrorSignals {
	const signals: ErrorSignals = {
		messages: [],
		statuses: new Set(),
		codes: new Set(),
	};
	try {
		collectSignals(error, signals, new Set(), 0);
	} catch {
		// Host errors are untrusted values; an unreadable property is unknown.
	}
	return signals;
}

/** Browser-safe provider classification without importing a provider SDK. */
export function classifyProviderError(error: unknown): ProviderErrorClass {
	const signals = collectSignalsFrom(error);
	if ([...signals.codes].some((code) => CONTEXT_WINDOW_CODES.has(code))) {
		return "context_window_exceeded";
	}
	if ([...signals.statuses].some((status) => AUTH_STATUSES.has(status))) {
		return "auth";
	}
	if (
		signals.statuses.has(429) ||
		signals.messages.some((message) =>
			RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message)),
		)
	) {
		return "unknown";
	}
	if (
		signals.statuses.size > 0 &&
		![...signals.statuses].some((status) =>
			CONTEXT_WINDOW_STATUSES.has(status),
		)
	) {
		return "unknown";
	}
	return signals.messages.some((message) =>
		CONTEXT_WINDOW_PATTERNS.some((pattern) => pattern.test(message)),
	)
		? "context_window_exceeded"
		: "unknown";
}

/** Browser-safe retryability based only on host-supplied error fields. */
export function isRetryableProviderError(error: unknown): boolean {
	const signals = collectSignalsFrom(error);
	const statuses = [...signals.statuses];
	if (statuses.some((status) => AUTH_STATUSES.has(status))) return false;
	if ([...signals.codes].some((code) => CONTEXT_WINDOW_CODES.has(code))) {
		return false;
	}
	if (signals.retryable !== undefined) return signals.retryable;
	if (
		statuses.some(
			(status) =>
				RETRYABLE_STATUSES.has(status) || (status >= 500 && status <= 599),
		)
	) {
		return true;
	}
	if (statuses.some((status) => status >= 400 && status < 500)) return false;
	return signals.messages.some((message) =>
		PROVIDER_RETURNED_ERROR_PATTERN.test(message),
	);
}
