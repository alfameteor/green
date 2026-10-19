import { ApiError } from '../api-error';
import type { TApiRequest } from '../types';
import { checkAccountResponseSchema } from './schemas';
import type { TCheckAccountRequest, TCheckAccountResponse } from './types';

export const createContactsApi = (request: TApiRequest) => ({
	checkAccount: async (data: TCheckAccountRequest, signal?: AbortSignal): Promise<TCheckAccountResponse> => {
		const response = await request({
			endpoint: 'checkAccount',
			method: 'POST',
			body: data,
			schema: checkAccountResponseSchema,
			signal,
		});
		if ('status' in response) {
			if (response.data?.reason === 'rate_limit_exceeded') {
				throw new ApiError('Telegram ограничил поиск номеров. Повторите попытку позже.', 200, 'rate-limit');
			}
			if (response.reason === 'instance is starting or not authorized') {
				throw new ApiError(
					'Инстанс запускается или не авторизован. Проверьте подключение в GREEN-API.',
					200,
					'instance-unavailable',
				);
			}
			throw new ApiError('GREEN-API отклонил поиск получателя. Проверьте состояние инстанса.', 200, 'rejected');
		}
		return response;
	},
});
