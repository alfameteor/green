import { useCallback, useRef, useState } from 'react';

import type { TGreenApi, TNotification } from '@/api';
import { reachGoal } from '@/common/analytics/metrika';

import { STATUS_CACHE_LIMIT } from '../const/chat';
import type { TChat, TMessage } from '../types/chat';
import { addMessage, applyNotification } from '../utils/chat';
import { useConnection } from './connection';

export const useChats = (api: TGreenApi) => {
	const [chats, setChats] = useState<TChat[]>([]);
	const statuses = useRef(new Map<string, string>());
	const handleNotification = useCallback((notification: TNotification) => {
		const body = notification.body;
		if (body.typeWebhook === 'outgoingMessageStatus' && body.idMessage && body.status) {
			statuses.current.set(`${body.chatId ?? ''}:${body.idMessage}`, body.status);
			if (statuses.current.size > STATUS_CACHE_LIMIT) {
				const oldest = statuses.current.keys().next().value;
				if (oldest !== undefined) {
					statuses.current.delete(oldest);
				}
			}
		}
		if (body.typeWebhook === 'incomingMessageReceived') {
			reachGoal('message_received');
		}
		setChats((current) => applyNotification(current, notification));
	}, []);
	const connection = useConnection({ api, onNotification: handleNotification });
	const openChat = (chat: TChat) => {
		setChats((current) => (current.some((item) => item.id === chat.id) ? current : [chat, ...current]));
	};
	const recordSent = (chatId: string, message: TMessage) => {
		const status =
			statuses.current.get(`${chatId}:${message.id}`) ?? statuses.current.get(`:${message.id}`) ?? 'queued';
		setChats((current) => addMessage(current, chatId, { ...message, status }));
	};
	return { chats, ...connection, openChat, recordSent };
};
