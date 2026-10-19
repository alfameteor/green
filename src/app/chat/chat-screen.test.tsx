// @vitest-environment jsdom
import { StrictMode } from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { Providers } from '@/api/query-provider';

import HomePage from '../page';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it('connects, creates a chat, sends, receives a reply and clears the session on logout', async () => {
	const pollSignals: AbortSignal[] = [];
	let deliverReply: ((response: Response) => void) | undefined;
	const json = (data: unknown) => new Response(JSON.stringify(data));
	const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
		if (url.includes('/getStateInstance')) {
			return json({ stateInstance: 'authorized' });
		}
		if (url.includes('/getSettings')) {
			return json({
				typeInstance: 'telegram',
				webhookUrl: '',
				incomingWebhook: 'yes',
				outgoingWebhook: 'yes',
				stateWebhook: 'yes',
			});
		}
		if (url.includes('/checkAccount')) {
			return json({ exist: true, chatId: '123', username: '@anna' });
		}
		if (url.includes('/sendMessage')) {
			return json({ idMessage: 'outgoing-1' });
		}
		if (url.includes('/deleteNotification')) {
			return json({ result: true });
		}
		if (url.includes('/receiveNotification')) {
			const signal = options.signal as AbortSignal;
			pollSignals.push(signal);
			return new Promise<Response>((resolve, reject) => {
				deliverReply = resolve;
				signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
					once: true,
				});
			});
		}
		throw new Error(`Unexpected test endpoint: ${url}`);
	});
	vi.stubGlobal('fetch', fetchMock);
	// jsdom does not implement layout-driven scrolling.
	const scroll = vi.fn();
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scroll, configurable: true });

	render(
		<StrictMode>
			<Providers>
				<HomePage />
			</Providers>
		</StrictMode>,
	);
	expect((screen.getByRole('textbox', { name: 'Сообщение' }) as HTMLTextAreaElement).disabled).toBe(true);
	expect(screen.queryByText('Ваш Telegram.')).toBeNull();
	expect(fetchMock).not.toHaveBeenCalled();
	fireEvent.change(screen.getByPlaceholderText('https://4100.api.green-api.com'), {
		target: { value: 'https://4100.api.green-api.com' },
	});
	fireEvent.change(screen.getByPlaceholderText('Например, 4100000000'), { target: { value: '4100000000' } });
	fireEvent.change(screen.getByPlaceholderText('Ваш apiTokenInstance'), { target: { value: 'test-only' } });
	fireEvent.click(screen.getByRole('button', { name: 'Начать общение' }));
	await screen.findByText('Telegram подключён');
	expect(screen.getByRole('heading', { name: 'Подключить Telegram' })).toBeTruthy();
	expect((screen.getByRole('button', { name: 'Инстанс выбран' }) as HTMLButtonElement).disabled).toBe(true);

	fireEvent.click(screen.getAllByRole('button', { name: 'Новый чат' })[0]);
	fireEvent.change(screen.getByPlaceholderText('+375 29 123 45 67 или @username'), {
		target: { value: '+375 29 123 45 67' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));

	const composer = await screen.findByRole('textbox', { name: 'Сообщение' });
	fireEvent.change(composer, { target: { value: 'Привет из теста' } });
	fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
	await screen.findByText('Привет из теста', { exact: true });
	await waitFor(() => expect((composer as HTMLTextAreaElement).value).toBe(''));
	expect(fetchMock.mock.calls.filter(([url]) => url.includes('/sendMessage'))).toHaveLength(1);
	expect(fetchMock.mock.calls.every(([url]) => !url.includes('test-only'))).toBe(true);
	expect(
		fetchMock.mock.calls.every(([_url, options]) => {
			const headers = options?.headers as Record<string, string> | undefined;
			return (
				headers?.['x-green-api-url'] === 'https://4100.api.green-api.com' &&
				headers?.['x-green-id-instance'] === '4100000000' &&
				headers?.['x-green-api-token'] === 'test-only'
			);
		}),
	).toBe(true);

	await act(async () =>
		deliverReply!(
			json({
				receiptId: 77,
				body: {
					typeWebhook: 'incomingMessageReceived',
					idMessage: 'incoming-1',
					senderData: { chatId: '123', chatName: 'Анна' },
					messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ответ из Telegram' } },
				},
			}),
		),
	);
	await within(screen.getByRole('log', { name: 'Сообщения' })).findByText('Ответ из Telegram', { exact: true });
	await waitFor(() =>
		expect(fetchMock.mock.calls.some(([url, options]) => url.endsWith('/77') && options.method === 'DELETE')).toBe(
			true,
		),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Выйти' }));
	await screen.findByRole('heading', { name: 'Подключить Telegram' });
	expect((screen.getByRole('textbox', { name: 'Сообщение' }) as HTMLTextAreaElement).disabled).toBe(true);
	expect((screen.getByPlaceholderText('Ваш apiTokenInstance') as HTMLInputElement).value).toBe('');
	expect(screen.queryByText('Привет из теста')).toBeNull();
	expect(pollSignals.every((signal) => signal.aborted)).toBe(true);
});

it('creates a chat by @username and displays username in header and chat list', async () => {
	const json = (data: unknown) => new Response(JSON.stringify(data));
	const fetchMock = vi.fn(async (url: string, _options?: RequestInit) => {
		if (url.includes('/getStateInstance')) {
			return json({ stateInstance: 'authorized' });
		}

		if (url.includes('/getSettings')) {
			return json({
				typeInstance: 'telegram',
				webhookUrl: '',
				incomingWebhook: 'yes',
				outgoingWebhook: 'yes',
				stateWebhook: 'yes',
			});
		}
		if (url.includes('/checkAccount')) {
			return json({ exist: true, chatId: '456', username: '@durov' });
		}
		if (url.includes('/receiveNotification')) {
			return new Promise<Response>(() => {});
		}
		throw new Error(`Unexpected test endpoint: ${url}`);
	});
	vi.stubGlobal('fetch', fetchMock);
	const scroll = vi.fn();
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scroll, configurable: true });

	render(
		<StrictMode>
			<Providers>
				<HomePage />
			</Providers>
		</StrictMode>,
	);

	fireEvent.change(screen.getByPlaceholderText('https://4100.api.green-api.com'), {
		target: { value: 'https://4100.api.green-api.com' },
	});
	fireEvent.change(screen.getByPlaceholderText('Например, 4100000000'), { target: { value: '4100000000' } });
	fireEvent.change(screen.getByPlaceholderText('Ваш apiTokenInstance'), { target: { value: 'test-only' } });
	fireEvent.click(screen.getByRole('button', { name: 'Начать общение' }));
	await screen.findByText('Telegram подключён');

	fireEvent.click(screen.getAllByRole('button', { name: 'Новый чат' })[0]);
	fireEvent.change(screen.getByPlaceholderText('+375 29 123 45 67 или @username'), {
		target: { value: 'durov' },
	});
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));

	await screen.findByRole('heading', { name: '@durov' });
	expect(screen.getByRole('button', { name: /@durov/ })).toBeTruthy();
	expect(
		fetchMock.mock.calls.some(
			([url, options]) =>
				url.includes('/checkAccount') &&
				typeof options?.body === 'string' &&
				JSON.parse(options.body).username === '@durov',
		),
	).toBe(true);
});
