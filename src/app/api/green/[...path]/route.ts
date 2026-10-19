import { GREEN_API_HEADER_API_TOKEN, GREEN_API_HEADER_API_URL, GREEN_API_HEADER_ID_INSTANCE } from '@/api/const';
import { validateCredentials } from '@/telegram/features/connect-instance/utils/validate-credentials';

type TRouteContext = {
	params: Promise<{
		path: string[];
	}>;
};

// Only these headers travel between the browser and GREEN-API: cookies and other
// client headers never leave the app, upstream service headers never reach the client.
const FORWARDED_REQUEST_HEADERS = ['content-type', 'accept'];
const FORWARDED_RESPONSE_HEADERS = ['content-type'];
// GREEN-API method names are plain words (sendMessage, receiveNotification, …).
const ENDPOINT_PATTERN = /^[A-Za-z]+$/;

const noStoreJson = (error: string, status: number) =>
	Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

const pickHeaders = (source: Headers, names: string[]) => {
	const headers = new Headers();
	for (const name of names) {
		const value = source.get(name);
		if (value) {
			headers.set(name, value);
		}
	}
	return headers;
};

const handleProxy = async (request: Request, context: TRouteContext): Promise<Response> => {
	const apiUrl = request.headers.get(GREEN_API_HEADER_API_URL)?.trim();
	const idInstance = request.headers.get(GREEN_API_HEADER_ID_INSTANCE)?.trim();
	const apiTokenInstance = request.headers.get(GREEN_API_HEADER_API_TOKEN)?.trim();

	if (!apiUrl || !idInstance || !apiTokenInstance) {
		return Response.json(
			{
				error: 'Отсутствуют обязательные заголовки авторизации GREEN-API (x-green-api-url, x-green-id-instance, x-green-api-token).',
			},
			{
				status: 401,
				headers: {
					'Cache-Control': 'no-store',
				},
			},
		);
	}

	const { path: pathSegments } = await context.params;
	if (!pathSegments || pathSegments.length === 0) {
		return Response.json(
			{ error: 'Не указан целевой метод GREEN-API.' },
			{
				status: 400,
				headers: {
					'Cache-Control': 'no-store',
				},
			},
		);
	}

	// The proxy must not become an open relay: target host and path are validated
	// with the same rules as the login form (https://*.green-api.com, numeric idInstance).
	let credentials: ReturnType<typeof validateCredentials>;
	try {
		credentials = validateCredentials({ apiUrl, idInstance, apiTokenInstance });
	} catch {
		return noStoreJson('Недопустимые данные подключения GREEN-API.', 400);
	}

	const [endpoint, ...rest] = pathSegments;
	if (!ENDPOINT_PATTERN.test(endpoint)) {
		return noStoreJson('Недопустимый метод GREEN-API.', 400);
	}
	const suffix = rest.length > 0 ? `/${rest.map((segment) => encodeURIComponent(segment)).join('/')}` : '';
	const requestUrl = new URL(request.url);
	const searchParams = requestUrl.search;
	const targetUrl = `${credentials.apiUrl}/waInstance${credentials.idInstance}/${endpoint}/${credentials.apiTokenInstance}${suffix}${searchParams}`;

	const forwardHeaders = pickHeaders(request.headers, FORWARDED_REQUEST_HEADERS);

	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
	let body: string | undefined;
	if (hasBody) {
		const text = await request.text();
		if (text) {
			body = text;
		}
	}

	try {
		const response = await fetch(targetUrl, {
			method: request.method,
			headers: forwardHeaders,
			body,
			signal: request.signal,
			cache: 'no-store',
		});

		const responseHeaders = pickHeaders(response.headers, FORWARDED_RESPONSE_HEADERS);
		responseHeaders.set('Cache-Control', 'no-store');

		const responseText = await response.text();
		return new Response(responseText, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		});
	} catch (error) {
		if (request.signal.aborted) {
			return new Response(null, { status: 499, statusText: 'Client Closed Request' });
		}
		const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
		return noStoreJson(`Не удалось связаться с GREEN-API: ${message}`, 502);
	}
};

export const dynamic = 'force-dynamic';

export const GET = (request: Request, context: TRouteContext) => handleProxy(request, context);
export const POST = (request: Request, context: TRouteContext) => handleProxy(request, context);
export const DELETE = (request: Request, context: TRouteContext) => handleProxy(request, context);
