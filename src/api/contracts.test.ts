import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGreenApi } from './create-green-api';

const api = createGreenApi({
	apiUrl: 'https://4100.api.green-api.com',
	idInstance: '4100000',
	apiTokenInstance: 'private-test-token',
});
const respond = (data: unknown) =>
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(data))));
afterEach(() => vi.unstubAllGlobals());

describe('runtime API contracts', () => {
	it.each([{}, { idMessage: 42 }, { idMessage: '' }, null])(
		'rejects an invalid send acknowledgement: %j',
		async (data) => {
			respond(data);
			await expect(api.messages.sendMessage({ chatId: '123', message: 'Hello' })).rejects.toMatchObject({
				code: 'protocol',
			});
		},
	);
	it('does not expose a malformed response payload', async () => {
		respond({ idMessage: { secret: 'private-test-token' } });
		await expect(api.messages.sendMessage({ chatId: '123', message: 'Hello' })).rejects.toMatchObject({
			message: 'GREEN-API вернул ответ неожиданного формата.',
		});
	});
	it('classifies invalid JSON separately from network failures', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json private-test-token')));
		await expect(api.instance.getState()).rejects.toMatchObject({
			code: 'protocol',
			message: 'GREEN-API вернул некорректный JSON.',
		});
	});
	it.each([
		[{ status: false, data: { reason: 'rate_limit_exceeded', retryAfter: 11930619 } }, 'rate-limit'],
		[{ status: false, reason: 'instance is starting or not authorized' }, 'instance-unavailable'],
		[{ status: false, reason: 'private-test-token' }, 'rejected'],
	])('distinguishes a business error from an absent account', async (data, code) => {
		respond(data);
		await expect(api.contacts.checkAccount({ phoneNumber: 79990000000 })).rejects.toMatchObject({ code });
	});
	it('preserves the explicit account-not-found result', async () => {
		respond({ exist: false, chatId: '' });
		await expect(api.contacts.checkAccount({ phoneNumber: 79990000000 })).resolves.toEqual({
			exist: false,
			chatId: '',
		});
		respond({ exist: false, chatId: '' });
		await expect(api.contacts.checkAccount({ username: '@unknown' })).resolves.toEqual({
			exist: false,
			chatId: '',
		});
	});
	it('requires a chat id for an existing account', async () => {
		respond({ exist: true });
		await expect(api.contacts.checkAccount({ phoneNumber: 79990000000 })).rejects.toMatchObject({
			code: 'protocol',
		});
	});
	it('parses existing account response with username and phoneNumber', async () => {
		respond({ exist: true, chatId: '123', username: '@durov', phoneNumber: 79990000000 });
		await expect(api.contacts.checkAccount({ username: '@durov' })).resolves.toEqual({
			exist: true,
			chatId: '123',
			username: '@durov',
			phoneNumber: 79990000000,
		});
	});

	it.each([
		{ receiptId: 7, body: null },
		{ receiptId: '7', body: { typeWebhook: 'unknown' } },
		{
			receiptId: 7,
			body: {
				typeWebhook: 'incomingMessageReceived',
				idMessage: '1',
				senderData: { chatId: '123' },
				messageData: { typeMessage: 'textMessage' },
			},
		},
		{ receiptId: 7, body: { typeWebhook: 'stateInstanceChanged' } },
	])('rejects damaged notifications before they enter application state', async (data) => {
		respond(data);
		await expect(api.notifications.receiveNotification(new AbortController().signal)).rejects.toMatchObject({
			code: 'protocol',
		});
	});
	it.each([
		{ typeWebhook: 'futureWebhook', newField: true },
		{
			typeWebhook: 'outgoingMessageStatus',
			chatId: '123',
			status: 'failed',
			description: 'chatId unresolvable on this session',
		},
		{ typeWebhook: 'outgoingMessageStatus', chatId: '123', status: 'noAccount' },
		{
			typeWebhook: 'outgoingMessageStatus',
			status: 'failed',
			description: 'status without chatId',
		},
	])('accepts unsupported events and failure statuses without a message id', async (body) => {
		respond({ receiptId: 7, body });
		await expect(api.notifications.receiveNotification(new AbortController().signal)).resolves.toMatchObject({
			receiptId: 7,
			body: { typeWebhook: body.typeWebhook },
		});
	});
	it('rejects an invalid delete acknowledgement', async () => {
		respond({ result: 'true' });
		await expect(api.notifications.deleteNotification(7, new AbortController().signal)).rejects.toMatchObject({
			code: 'protocol',
		});
	});
});
