import { afterEach, describe, expect, it, vi } from 'vitest';

import { GREEN_API_HEADER_API_TOKEN, GREEN_API_HEADER_API_URL, GREEN_API_HEADER_ID_INSTANCE } from '@/api/const';

import { DELETE, GET, POST } from './[...path]/route';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('BFF Route Handler /api/green/[...path]', () => {
	const validHeaders = {
		[GREEN_API_HEADER_API_URL]: 'https://4100.api.green-api.com',
		[GREEN_API_HEADER_ID_INSTANCE]: '4100000',
		[GREEN_API_HEADER_API_TOKEN]: 'test-secret-token',
	};

	it('returns 401 when required authorization headers are missing', async () => {
		const request = new Request('http://localhost:3000/api/green/getStateInstance', {
			method: 'GET',
			headers: {
				[GREEN_API_HEADER_API_URL]: 'https://4100.api.green-api.com',
				// missing idInstance and apiToken
			},
		});

		const response = await GET(request, {
			params: Promise.resolve({ path: ['getStateInstance'] }),
		});

		expect(response.status).toBe(401);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const body = (await response.json()) as { error?: string };
		expect(body.error).toContain('Отсутствуют обязательные заголовки');
	});

	it('returns 400 when path parameter is empty', async () => {
		const request = new Request('http://localhost:3000/api/green', {
			method: 'GET',
			headers: validHeaders,
		});

		const response = await GET(request, {
			params: Promise.resolve({ path: [] }),
		});

		expect(response.status).toBe(400);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('proxies GET requests to GREEN-API and preserves query parameters and Cache-Control: no-store', async () => {
		const upstreamResponse = new Response(JSON.stringify({ receiptId: 101, body: null }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
		const fetchMock = vi.fn().mockResolvedValue(upstreamResponse);
		vi.stubGlobal('fetch', fetchMock);

		const request = new Request('http://localhost:3000/api/green/receiveNotification?receiveTimeout=20', {
			method: 'GET',
			headers: validHeaders,
		});

		const response = await GET(request, {
			params: Promise.resolve({ path: ['receiveNotification'] }),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ receiptId: 101, body: null });

		expect(fetchMock).toHaveBeenCalledWith(
			'https://4100.api.green-api.com/waInstance4100000/receiveNotification/test-secret-token?receiveTimeout=20',
			expect.objectContaining({
				method: 'GET',
				cache: 'no-store',
			}),
		);
	});

	it('proxies POST requests with body and forward headers', async () => {
		const upstreamResponse = new Response(JSON.stringify({ idMessage: 'msg-42' }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
		const fetchMock = vi.fn().mockResolvedValue(upstreamResponse);
		vi.stubGlobal('fetch', fetchMock);

		const payload = { chatId: '123@c.us', message: 'Тестовое сообщение' };
		const request = new Request('http://localhost:3000/api/green/sendMessage', {
			method: 'POST',
			headers: {
				...validHeaders,
				'content-type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		const response = await POST(request, {
			params: Promise.resolve({ path: ['sendMessage'] }),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ idMessage: 'msg-42' });

		expect(fetchMock).toHaveBeenCalledWith(
			'https://4100.api.green-api.com/waInstance4100000/sendMessage/test-secret-token',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify(payload),
			}),
		);
	});

	it('proxies DELETE requests with multi-segment path', async () => {
		const upstreamResponse = new Response(JSON.stringify({ result: true }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
		const fetchMock = vi.fn().mockResolvedValue(upstreamResponse);
		vi.stubGlobal('fetch', fetchMock);

		const request = new Request('http://localhost:3000/api/green/deleteNotification/77', {
			method: 'DELETE',
			headers: validHeaders,
		});

		const response = await DELETE(request, {
			params: Promise.resolve({ path: ['deleteNotification', '77'] }),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({ result: true });

		expect(fetchMock).toHaveBeenCalledWith(
			'https://4100.api.green-api.com/waInstance4100000/deleteNotification/test-secret-token/77',
			expect.objectContaining({
				method: 'DELETE',
				cache: 'no-store',
			}),
		);
	});

	it('returns 502 when GREEN-API network connection fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

		const request = new Request('http://localhost:3000/api/green/getStateInstance', {
			method: 'GET',
			headers: validHeaders,
		});

		const response = await GET(request, {
			params: Promise.resolve({ path: ['getStateInstance'] }),
		});

		expect(response.status).toBe(502);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const body = (await response.json()) as { error?: string };
		expect(body.error).toContain('Не удалось связаться с GREEN-API');
	});

	it('forwards upstream status code from GREEN-API', async () => {
		const upstreamResponse = new Response('Unauthorized', { status: 401 });
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstreamResponse));

		const request = new Request('http://localhost:3000/api/green/getStateInstance', {
			method: 'GET',
			headers: validHeaders,
		});

		const response = await GET(request, {
			params: Promise.resolve({ path: ['getStateInstance'] }),
		});

		expect(response.status).toBe(401);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.text()).toBe('Unauthorized');
	});

	it.each([
		['foreign host', { [GREEN_API_HEADER_API_URL]: 'https://evil.example.com' }],
		['plain http', { [GREEN_API_HEADER_API_URL]: 'http://4100.api.green-api.com' }],
		['look-alike host', { [GREEN_API_HEADER_API_URL]: 'https://green-api.com.evil.io' }],
		['non-numeric idInstance', { [GREEN_API_HEADER_ID_INSTANCE]: '../admin' }],
	])('rejects %s without calling upstream', async (_case, override) => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const request = new Request('http://localhost:3000/api/green/getStateInstance', {
			method: 'GET',
			headers: { ...validHeaders, ...override },
		});
		const response = await GET(request, { params: Promise.resolve({ path: ['getStateInstance'] }) });
		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects endpoints that are not plain method names', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const request = new Request('http://localhost:3000/api/green/x', { method: 'GET', headers: validHeaders });
		const response = await GET(request, { params: Promise.resolve({ path: ['..'] }) });
		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('does not forward cookies or other client headers upstream', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const request = new Request('http://localhost:3000/api/green/getStateInstance', {
			method: 'GET',
			headers: {
				...validHeaders,
				cookie: 'session=secret',
				authorization: 'Bearer x',
				accept: 'application/json',
			},
		});
		await GET(request, { params: Promise.resolve({ path: ['getStateInstance'] }) });
		const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers;
		expect(headers.get('cookie')).toBeNull();
		expect(headers.get('authorization')).toBeNull();
		expect(headers.get(GREEN_API_HEADER_API_TOKEN)).toBeNull();
		expect(headers.get('accept')).toBe('application/json');
	});
});
