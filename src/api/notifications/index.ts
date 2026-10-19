import type { TApiRequest } from '../types';
import { receiveNotificationSchema, deleteNotificationSchema } from './schemas';

export const createNotificationsApi = (request: TApiRequest) => ({
	receiveNotification: (signal: AbortSignal) =>
		request({
			schema: receiveNotificationSchema,
			endpoint: 'receiveNotification',
			query: { receiveTimeout: '20' },
			signal,
		}),
	deleteNotification: (receiptId: number, signal: AbortSignal) =>
		request({
			schema: deleteNotificationSchema,
			endpoint: 'deleteNotification',
			method: 'DELETE',
			path: String(receiptId),
			signal,
		}),
});
