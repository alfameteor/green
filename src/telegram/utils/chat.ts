import type { TNotification } from '@/api';

import type { TChat, TMessage } from '../types/chat';

export const getChatTitle = (chat: Pick<TChat, 'name' | 'username' | 'phone'>): string => {
	if (chat.username) {
		return chat.username.startsWith('@') ? chat.username : `@${chat.username}`;
	}
	return chat.phone || chat.name || 'Чат';
};

export const addMessage = (chats: TChat[], chatId: string, message: TMessage, name?: string): TChat[] => {
	const chat = chats.find((item) => item.id === chatId) ?? { id: chatId, name: name || chatId, messages: [] };
	if (chat.messages.some((item) => item.id === message.id)) {
		return chats;
	}
	const updatedChat = {
		...chat,
		messages: [...chat.messages, message].sort((first, second) => first.time - second.time),
	};
	return [updatedChat, ...chats.filter((item) => item.id !== chatId)];
};

const updateDeliveryStatus = (chats: TChat[], body: TNotification['body']): TChat[] => {
	return chats.map((chat) => {
		if (body.chatId && chat.id !== body.chatId) {
			return chat;
		}
		const messages = chat.messages.map((message) => {
			if (!message.outgoing || message.id !== body.idMessage) {
				return message;
			}
			return { ...message, status: body.status };
		});
		return { ...chat, messages };
	});
};

const getNotificationText = (data: TNotification['body']['messageData']) => {
	if (data?.typeMessage === 'textMessage') {
		return data.textMessageData?.textMessage;
	}
	if (data?.typeMessage === 'extendedTextMessage') {
		return data.extendedTextMessageData?.text;
	}
	return undefined;
};

export const applyNotification = (chats: TChat[], notification: TNotification): TChat[] => {
	const { body } = notification;
	if (body.typeWebhook === 'outgoingMessageStatus') {
		return updateDeliveryStatus(chats, body);
	}
	if (body.typeWebhook !== 'incomingMessageReceived' || !body.senderData?.chatId || !body.idMessage) {
		return chats;
	}
	const text = getNotificationText(body.messageData);
	if (typeof text !== 'string') {
		return chats;
	}
	return addMessage(
		chats,
		body.senderData.chatId,
		{
			id: body.idMessage,
			text,
			time: (body.timestamp ?? Date.now() / 1000) * 1000,
			outgoing: false,
		},
		body.senderData.chatName || body.senderData.senderName,
	);
};
