import { ApiError } from '@/api';
import type { TGreenApi, TNotification } from '@/api';
import { sleep } from '@/common/utils/async';

import { POLL_INTERVAL_MS, RETRY_DELAY_MS, MAX_RETRY_DELAY_MS } from '../const/chat';

// One queue consumer: process first, acknowledge second. Failed acknowledgements
// cause redelivery; the chat reducer deduplicates messages by chatId + idMessage.
export const pollNotifications = async (
	api: TGreenApi,
	signal: AbortSignal,
	onNotification: (notification: TNotification) => void,
	onError: (message: string) => void,
	onStopped?: (message: string) => void,
) => {
	let failures = 0;
	let pendingReceiptId: number | null = null;
	while (!signal.aborted) {
		try {
			if (pendingReceiptId !== null) {
				const ack = await api.notifications.deleteNotification(pendingReceiptId, signal);
				if (!ack?.result) {
					throw new Error('Не удалось подтвердить получение. Повторяем запрос.');
				}
				pendingReceiptId = null;
			} else {
				const notification = await api.notifications.receiveNotification(signal);
				if (signal.aborted) {
					break;
				}
				if (notification) {
					onNotification(notification);
					if (signal.aborted) {
						break;
					}
					pendingReceiptId = notification.receiptId;
					const ack = await api.notifications.deleteNotification(notification.receiptId, signal);
					if (!ack?.result) {
						throw new Error('Не удалось подтвердить получение. Повторяем запрос.');
					}
					pendingReceiptId = null;
				}
			}
			if (signal.aborted) {
				break;
			}
			failures = 0;
			onError('');
			await sleep(POLL_INTERVAL_MS, signal);
		} catch (error) {
			if (signal.aborted) {
				break;
			}
			const message =
				error instanceof ApiError && error.code === 'protocol'
					? 'Получение остановлено: неожиданный формат ответа GREEN-API. Автоматическая обработка приостановлена. Проверьте совместимость API перед повторным подключением.'
					: error instanceof Error
						? error.message
						: 'Ошибка получения сообщений.';
			onError(message);
			if (error instanceof ApiError && (error.code === 'protocol' || [401, 403].includes(error.status))) {
				onStopped?.(message);
				break;
			}
			await sleep(Math.min(MAX_RETRY_DELAY_MS, RETRY_DELAY_MS * 2 ** failures++), signal);
		}
	}
};
