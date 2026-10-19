import { afterEach, expect, it, vi } from 'vitest';

import { connectInstance } from './connect-instance';

const credentials = { apiUrl: 'https://4100.api.green-api.com', idInstance: '4100000', apiTokenInstance: 'test-token' };
const settings = {
	typeInstance: 'telegram',
	webhookUrl: '',
	incomingWebhook: 'yes',
	outgoingWebhook: 'yes',
	stateWebhook: 'yes',
};
afterEach(() => vi.unstubAllGlobals());

it.each([
	[{ ...settings, typeInstance: 'whatsapp' }, 'Telegram-инстанс'],
	[{ ...settings, incomingWebhook: 'no' }, 'incomingWebhook'],
	[{ ...settings, outgoingWebhook: 'no' }, 'outgoingWebhook'],
	[{ ...settings, stateWebhook: 'no' }, 'stateWebhook'],
	[{ ...settings, webhookUrl: 'https://example.com/webhook' }, 'Webhook URL'],
])('rejects an incompatible instance configuration', async (configuration, message) => {
	const fetch = vi
		.fn()
		.mockImplementation(
			async (url: string) =>
				new Response(
					JSON.stringify(url.includes('getStateInstance') ? { stateInstance: 'authorized' } : configuration),
				),
		);
	vi.stubGlobal('fetch', fetch);
	await expect(connectInstance(credentials, new AbortController().signal)).rejects.toThrow(message);
	expect(fetch).toHaveBeenCalledTimes(2);
});

it('stops preflight before settings when the instance is not authorized', async () => {
	const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ stateInstance: 'notAuthorized' })));
	vi.stubGlobal('fetch', fetch);
	await expect(connectInstance(credentials, new AbortController().signal)).rejects.toThrow('authorized');
	expect(fetch).toHaveBeenCalledTimes(1);
});
