import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGreenApi } from '.';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('GREEN-API transport', () => {
	const api = createGreenApi({
		apiUrl: 'https://4100.api.green-api.com',
		idInstance: '4100000',
		apiTokenInstance: 'test-token',
	});

	it('uses the Telegram sendMessage contract', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ idMessage: '42' })));
		vi.stubGlobal('fetch', fetch);
		expect(await api.messages.sendMessage({ chatId: '123', message: 'Привет' })).toEqual({ idMessage: '42' });
		expect(fetch).toHaveBeenCalledWith(
			'https://4100.api.green-api.com/waInstance4100000/sendMessage/test-token',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ chatId: '123', message: 'Привет' }),
			}),
		);
	});

	it('accepts an empty long-poll response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
		expect(await api.notifications.receiveNotification(new AbortController().signal)).toBeNull();
	});

	it('does not expose a token from an error response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('url/test-token', { status: 401 })));
		await expect(api.instance.getState()).rejects.toThrow('Неверный idInstance');
	});

	it('sanitizes apiTokenInstance from network error messages', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockRejectedValue(new TypeError('Failed to fetch https://.../test-token/something')),
		);
		await expect(api.instance.getState()).rejects.toThrowError(expect.not.stringContaining('test-token'));
		await expect(api.instance.getState()).rejects.toThrowError(
			'Не удалось связаться с GREEN-API. Проверьте сеть и apiUrl. (Failed to fetch https://.../***/something)',
		);
	});
});

describe('GREEN-API browser proxy transport', () => {
	const browserApi = createGreenApi(
		{
			apiUrl: 'https://4100.api.green-api.com',
			idInstance: '4100000',
			apiTokenInstance: 'test-token',
		},
		{ useProxy: true },
	);

	it('routes requests to /api/green without token in URL and passes credentials in headers', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ idMessage: '42' })));
		vi.stubGlobal('fetch', fetch);

		expect(await browserApi.messages.sendMessage({ chatId: '123', message: 'Привет' })).toEqual({
			idMessage: '42',
		});
		expect(fetch).toHaveBeenCalledWith(
			'/api/green/sendMessage',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'x-green-api-url': 'https://4100.api.green-api.com',
					'x-green-id-instance': '4100000',
					'x-green-api-token': 'test-token',
					'Content-Type': 'application/json',
				}),
				body: JSON.stringify({ chatId: '123', message: 'Привет' }),
			}),
		);
	});

	it('builds proxy url with path and query without exposing token in pathname', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: true })));
		vi.stubGlobal('fetch', fetch);

		await browserApi.notifications.deleteNotification(77, new AbortController().signal);

		expect(fetch).toHaveBeenCalledWith(
			'/api/green/deleteNotification/77',
			expect.objectContaining({
				method: 'DELETE',
				headers: expect.objectContaining({
					'x-green-api-url': 'https://4100.api.green-api.com',
					'x-green-id-instance': '4100000',
					'x-green-api-token': 'test-token',
				}),
			}),
		);
	});
});
