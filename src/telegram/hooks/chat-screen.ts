import { useState } from 'react';

import type { TGreenApi } from '@/api';
import { useSendMessage } from '@/telegram/features/send-message';
import { useChats } from '@/telegram/hooks/chats';
import type { TChat, TMessage } from '@/telegram/types/chat';

export const useChatScreen = (api: TGreenApi) => {
	const { chats, connection, isAvailable, reconnect, reportApiError, openChat, recordSent } = useChats(api);
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const selectedChat = chats.find((chat) => chat.id === selectedChatId);
	const handleMessageSent = (chatId: string, message: TMessage) => {
		recordSent(chatId, message);
		setDrafts((current) => ({ ...current, [chatId]: current[chatId] === message.text ? '' : current[chatId] }));
	};
	const { handleSend, isSending, isChatSending, errors } = useSendMessage(api, handleMessageSent, reportApiError);
	const handleChatCreated = (chat: TChat) => {
		openChat(chat);
		setSelectedChatId(chat.id);
	};
	const handleDraftChange = (text: string) => {
		if (selectedChatId) {
			setDrafts((current) => ({ ...current, [selectedChatId]: text }));
		}
	};
	const handleSendMessage = () => {
		if (selectedChatId && isAvailable) {
			handleSend(selectedChatId, drafts[selectedChatId] ?? '');
		}
	};
	return {
		chats,
		connection,
		isAvailable,
		reconnect,
		reportApiError,
		selectedChatId,
		selectedChat,
		isCreateChatOpen,
		isSending: selectedChatId ? isChatSending(selectedChatId) : isSending,
		draft: selectedChatId ? (drafts[selectedChatId] ?? '') : '',
		sendError: selectedChatId ? (errors[selectedChatId] ?? '') : '',
		handleSelectChat: setSelectedChatId,
		handleOpenCreateChat: () => {
			if (isAvailable) {
				setIsCreateChatOpen(true);
			}
		},
		handleCloseCreateChat: () => setIsCreateChatOpen(false),
		handleBack: () => setSelectedChatId(null),
		handleChatCreated,
		handleDraftChange,
		handleSendMessage,
	};
};
