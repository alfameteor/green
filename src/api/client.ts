import { ApiError } from './api-error';
import {
	GREEN_API_HEADER_API_TOKEN,
	GREEN_API_HEADER_API_URL,
	GREEN_API_HEADER_ID_INSTANCE,
	GREEN_API_PROXY_PREFIX,
	HTTP_ERROR_MESSAGES,
	REQUEST_TIMEOUT_MS,
} from './const';
import type { TApiRequest, TApiRequestConfig, TCredentials, TRequestOptions } from './types';

const buildDirectRequestUrl = (credentials: TCredentials, options: TRequestOptions) => {
	const { apiUrl, idInstance, apiTokenInstance } = credentials;
	const path = options.path ? `/${encodeURIComponent(options.path)}` : '';
	const url = new URL(`${apiUrl}/waInstance${idInstance}/${options.endpoint}/${apiTokenInstance}${path}`);
	for (const [key, value] of Object.entries(options.query ?? {})) {
		url.searchParams.set(key, value);
	}
	return url.toString();
};

const buildProxyRequestUrl = (options: TRequestOptions) => {
	const path = options.path ? `/${encodeURIComponent(options.path)}` : '';
	const searchParams = new URLSearchParams(options.query ?? {});
	const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
	return `${GREEN_API_PROXY_PREFIX}/${options.endpoint}${path}${query}`;
};

export const createApiRequest = (credentials: TCredentials, config?: TApiRequestConfig): TApiRequest => {
	const useProxy = config?.useProxy ?? typeof window !== 'undefined';

	const sanitizeErrorMessage = (message: string): string => {
		if (!credentials.apiTokenInstance) {
			return message;
		}
		return message.replaceAll(credentials.apiTokenInstance, '***');
	};

	return async <TResponse>(options: TRequestOptions<TResponse>): Promise<TResponse> => {
		const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
		const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
		const hasBody = options.body !== undefined;

		const requestUrl = useProxy ? buildProxyRequestUrl(options) : buildDirectRequestUrl(credentials, options);

		const headers: HeadersInit = useProxy
			? {
					[GREEN_API_HEADER_API_URL]: credentials.apiUrl,
					[GREEN_API_HEADER_ID_INSTANCE]: credentials.idInstance,
					[GREEN_API_HEADER_API_TOKEN]: credentials.apiTokenInstance,
					...(hasBody ? { 'Content-Type': 'application/json' } : {}),
				}
			: hasBody
				? { 'Content-Type': 'application/json' }
				: {};

		try {
			const response = await fetch(requestUrl, {
				method: options.method ?? 'GET',
				headers,
				body: hasBody ? JSON.stringify(options.body) : undefined,
				signal,
				referrerPolicy: 'no-referrer',
				cache: 'no-store',
			});
			if (!response.ok) {
				throw new ApiError(
					HTTP_ERROR_MESSAGES[response.status] ?? `Ошибка GREEN-API (${response.status}). Попробуйте позже.`,
					response.status,
				);
			}
			const text = await response.text();
			const data: unknown = text ? JSON.parse(text) : null;
			const parsed = options.schema.safeParse(data);
			if (!parsed.success) {
				// Never include payloads or validation details: they may contain private data.
				throw new ApiError('GREEN-API вернул ответ неожиданного формата.', response.status, 'protocol');
			}
			return parsed.data;
		} catch (error) {
			if (options.signal?.aborted) {
				throw error;
			}
			if (error instanceof ApiError) {
				error.message = sanitizeErrorMessage(error.message);
				throw error;
			}
			if (error instanceof SyntaxError) {
				throw new ApiError('GREEN-API вернул некорректный JSON.', 200, 'protocol');
			}
			if (timeoutSignal.aborted) {
				throw new Error('Сервер не ответил вовремя. Проверьте соединение.');
			}
			const originalMessage = error instanceof Error ? error.message : '';
			const baseMessage = 'Не удалось связаться с GREEN-API. Проверьте сеть и apiUrl.';
			const fullMessage = originalMessage ? `${baseMessage} (${originalMessage})` : baseMessage;
			throw new Error(sanitizeErrorMessage(fullMessage));
		}
	};
};
