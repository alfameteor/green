export const REQUEST_TIMEOUT_MS = 40000;
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
	400: 'GREEN-API отклонил запрос. Проверьте данные и настройки инстанса.',
	401: 'Неверный idInstance или apiTokenInstance.',
	403: 'Нет доступа к инстансу. Проверьте токен и состояние аккаунта.',
	429: 'Слишком много запросов. Подождите перед следующей попыткой.',
	469: 'Telegram временно ограничил запросы. Попробуйте позже.',
};

export const GREEN_API_HEADER_API_URL = 'x-green-api-url';
export const GREEN_API_HEADER_ID_INSTANCE = 'x-green-id-instance';
export const GREEN_API_HEADER_API_TOKEN = 'x-green-api-token';
export const GREEN_API_PROXY_PREFIX = '/api/green';
