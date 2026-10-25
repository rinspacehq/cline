import {
	AgentApprovalCard as ClineApprovalCard,
	AgentChangedFile as ClineChangedFile,
	AgentChangesPanel as ClineChangesPanel,
} from "@cline/ui";
import {
	Conversation,
	ConversationContent,
	ConversationViewport,
	Message,
	MessageContent,
	ToolActivity,
	ToolActivityContent,
	ToolActivityTrigger,
} from "@cline/ui/components/agent-chat";
import type { ReactNode } from "react";

export type ToolActivityStatus = "pending" | "running" | "success" | "error";

export interface AgentMessageView {
	id: string;
	role: "user" | "assistant" | "system" | "status" | "error";
	content: ReactNode;
}

export interface AgentMessageListProps {
	empty?: ReactNode;
	messages: readonly AgentMessageView[];
}

export function AgentMessageList({ empty, messages }: AgentMessageListProps) {
	return (
		<Conversation className="rinspace-cline-messages">
			<ConversationViewport aria-label="Agent conversation">
				<ConversationContent>
					{messages.length === 0 ? empty : null}
					{messages.map((message) => (
						<Message from={message.role} key={message.id}>
							<MessageContent>{message.content}</MessageContent>
						</Message>
					))}
				</ConversationContent>
			</ConversationViewport>
		</Conversation>
	);
}

export interface AgentToolViewProps {
	children?: ReactNode;
	label: ReactNode;
	status: ToolActivityStatus;
}

export function AgentToolView({ children, label, status }: AgentToolViewProps) {
	return (
		<ToolActivity>
			<ToolActivityTrigger label={label} status={status} />
			{children ? <ToolActivityContent>{children}</ToolActivityContent> : null}
		</ToolActivity>
	);
}

export interface AgentApprovalCardProps {
	description?: ReactNode;
	detail?: ReactNode;
	error?: ReactNode;
	meta?: ReactNode;
	onApprove: () => void;
	onReject: () => void;
	responding?: "approve" | "reject";
	title: ReactNode;
}

export function AgentApprovalCard(props: AgentApprovalCardProps) {
	return <ClineApprovalCard {...props} />;
}

export interface AgentDiffFileProps {
	additions: number;
	children: ReactNode;
	deletions: number;
	onCopyPath: () => void;
	path: string;
}

export function AgentDiffFile(props: AgentDiffFileProps) {
	return <ClineChangedFile {...props} />;
}

export interface AgentDiffPanelProps {
	children?: ReactNode;
	fileCount: number;
	onClose: () => void;
	title: string;
}

export function AgentDiffPanel(props: AgentDiffPanelProps) {
	return <ClineChangesPanel {...props} />;
}
