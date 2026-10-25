import { createGateway, type GatewayProviderSettings } from "@cline/llms";
import type {
	AgentModel,
	AgentRuntimeConfig as BaseAgentRuntimeConfig,
} from "@cline/shared";
import { AgentRuntime as HostedAgentRuntime } from "./hosted-agent-runtime";

export {
	type AgentEventListener,
	type AgentRunInput,
	AgentRuntimeAbortError,
} from "./hosted-agent-runtime";

export interface AgentRuntimeConfigWithModel extends BaseAgentRuntimeConfig {
	model: AgentModel;
}

export interface AgentRuntimeConfigWithProvider
	extends Omit<BaseAgentRuntimeConfig, "model"> {
	providerId: string;
	modelId: string;
	apiKey?: string;
	baseUrl?: string;
	headers?: Record<string, string>;
	options?: GatewayProviderSettings["options"];
}

export type AgentRuntimeConfig =
	| AgentRuntimeConfigWithModel
	| AgentRuntimeConfigWithProvider;

function hasPrebuiltModel(
	config: AgentRuntimeConfig,
): config is AgentRuntimeConfigWithModel {
	return "model" in config;
}

function resolveRuntimeConfig(
	config: AgentRuntimeConfig,
): AgentRuntimeConfigWithModel {
	if (hasPrebuiltModel(config)) {
		return config;
	}
	const { providerId, modelId, apiKey, baseUrl, headers, options, ...rest } =
		config;
	const gateway = createGateway({
		providerConfigs: [{ providerId, apiKey, baseUrl, headers, options }],
		telemetry: rest.telemetry,
	});
	return {
		...rest,
		model: gateway.createAgentModel({ providerId, modelId }),
		messageModelInfo: rest.messageModelInfo ?? {
			id: modelId,
			provider: providerId,
		},
	};
}

export class AgentRuntime extends HostedAgentRuntime {
	constructor(config: AgentRuntimeConfig) {
		super(resolveRuntimeConfig(config));
	}
}

export function createAgentRuntime(config: AgentRuntimeConfig): AgentRuntime {
	return new AgentRuntime(config);
}

export const Agent = AgentRuntime;
export type Agent = AgentRuntime;

export function createAgent(config: AgentRuntimeConfig): AgentRuntime {
	return new AgentRuntime(config);
}
