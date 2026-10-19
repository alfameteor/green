import type { TApiRequest } from '../types';
import { sendMessageResponseSchema } from './schemas';
import type { TSendMessageRequest } from './types';

export const createMessagesApi = (request: TApiRequest) => ({
	sendMessage: (data: TSendMessageRequest, signal?: AbortSignal) =>
		request({ endpoint: 'sendMessage', method: 'POST', body: data, schema: sendMessageResponseSchema, signal }),
});
