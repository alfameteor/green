'use client';

import { useState } from 'react';

import { useMutation } from '@tanstack/react-query';

import type { TGreenApi, TSendMessageRequest } from '@/api';
import { reachGoal } from '@/common/analytics/metrika';
import { useAbortableTask } from '@/common/hooks/abortable-task';
import { getErrorMessage } from '@/common/utils/errors';
import type { TMessage } from '@/telegram/types/chat';

import { MAX_MESSAGE_LENGTH, UNCERTAIN_SEND_HINT } from '../const';

// Mounted on the page so changing the selected chat cannot interrupt a send.
export const useSendMessage = (
	api: TGreenApi,
	onSent: (chatId: string, message: TMessage) => void,
	onApiError?: (error: unknown) => void,
) => {
	const runTask = useAbortableTask();
	const [sendingChatIds, setSendingChatIds] = useState<Set<string>>(() => new Set());
	const [errors, setErrors] = useState<Record<string, string>>({});
	const mutation = useMutation({
		retry: false,
		mutationFn: (data: TSendMessageRequest) =>
			runTask(async (signal) => {
				const response = await api.messages.sendMessage(data, signal);
				if (!response?.idMessage) {
					throw new Error('Сервер не подтвердил отправку.');
				}
				return response;
			}, `send-message:${data.chatId}`),
		onMutate: ({ chatId }) => {
			setSendingChatIds((current) => new Set(current).add(chatId));
			setErrors((current) => ({ ...current, [chatId]: '' }));
		},
		onSuccess: (response, { chatId, message }) => {
			reachGoal('message_sent');
			onSent(chatId, {
				id: String(response.idMessage),
				text: message,
				time: Date.now(),
				outgoing: true,
				status: 'queued',
			});
		},
		onError: (error, { chatId }) => {
			reachGoal('message_send_error');
			onApiError?.(error);
			setErrors((current) => ({ ...current, [chatId]: `${getErrorMessage(error)} ${UNCERTAIN_SEND_HINT}` }));
		},
		onSettled: (_data, _error, { chatId }) => {
			setSendingChatIds((current) => {
				const next = new Set(current);
				next.delete(chatId);
				return next;
			});
		},
	});
	const handleSend = (chatId: string, message: string) => {
		if (!message.trim() || message.length > MAX_MESSAGE_LENGTH || sendingChatIds.has(chatId)) {
			return;
		}
		mutation.mutate({ chatId, message });
	};
	return {
		handleSend,
		isSending: mutation.isPending,
		isChatSending: (chatId: string) => sendingChatIds.has(chatId),
		errors,
	};
};
