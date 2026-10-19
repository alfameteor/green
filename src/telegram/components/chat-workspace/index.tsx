'use client';

import cn from 'classnames';

import type { TGreenApi } from '@/api';
import { METRIKA_PRIVATE_CLASS } from '@/common/analytics/metrika';
import { ChatList } from '@/telegram/components/chat-list';
import { Conversation } from '@/telegram/components/conversation';
import { CreateChatDialog } from '@/telegram/features/create-chat';
import { MessageComposer } from '@/telegram/features/send-message';

import { useChatScreen } from '../../hooks/chat-screen';
import s from './s.module.css';

type TProps = {
	api: TGreenApi;
	instance: string;
	onLogout: () => void;
};

export const ChatWorkspace = ({ api, instance, onLogout }: TProps) => {
	const page = useChatScreen(api);
	return (
		<section aria-label="Telegram чат" className={cn(s.workspace, METRIKA_PRIVATE_CLASS)}>
			<ChatList
				chats={page.chats}
				selected={page.selectedChatId}
				instance={instance}
				pollError={page.connection.message}
				connectionLabel={page.connection.label}
				canCreateChat={page.isAvailable}
				onSelect={page.handleSelectChat}
				onNewChat={page.handleOpenCreateChat}
				onLogout={onLogout}
			/>
			<Conversation
				onReconnect={page.reconnect}
				isChecking={page.connection.status === 'checking'}
				chat={page.selectedChat}
				pollError={page.connection.message}
				connectionLabel={page.connection.label}
				canCreateChat={page.isAvailable}
				onBack={page.handleBack}
				onNewChat={page.handleOpenCreateChat}
				composer={
					<MessageComposer
						disabled={!page.selectedChat}
						isSendBlocked={!page.isAvailable}
						isSending={page.isSending}
						sendError={page.sendError}
						draft={page.draft}
						onDraftChange={page.handleDraftChange}
						onSend={page.handleSendMessage}
					/>
				}
			/>
			{page.isCreateChatOpen && (
				<CreateChatDialog
					isAvailable={page.isAvailable}
					onApiError={page.reportApiError}
					connectionMessage={page.connection.message}
					api={api}
					onClose={page.handleCloseCreateChat}
					onCreated={page.handleChatCreated}
				/>
			)}
		</section>
	);
};
