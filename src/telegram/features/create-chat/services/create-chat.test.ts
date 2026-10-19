import { describe, expect, it, vi } from 'vitest';

import type { TGreenApi } from '@/api';

import { createChat } from './create-chat';

const createMockApi = (checkAccount = vi.fn()) => {
	const api = {
		contacts: { checkAccount },
	} as unknown as TGreenApi;
	return { api, checkAccount };
};

describe('createChat service', () => {
	it('creates chat by phone number when account exists', async () => {
		const { api, checkAccount } = createMockApi(vi.fn().mockResolvedValue({ exist: true, chatId: 'chat_123' }));
		const signal = new AbortController().signal;

		const chat = await createChat(api, '+375 29 123 45 67', signal);

		expect(checkAccount).toHaveBeenCalledWith({ phoneNumber: 375291234567 }, signal);
		expect(chat).toEqual({
			id: 'chat_123',
			name: '+375291234567',
			phone: '+375291234567',
			username: undefined,
			messages: [],
		});
	});

	it('creates chat by phone number and preserves username if returned by API', async () => {
		const { api, checkAccount } = createMockApi(
			vi.fn().mockResolvedValue({ exist: true, chatId: 'chat_123', username: 'anna' }),
		);
		const signal = new AbortController().signal;

		const chat = await createChat(api, '+375291234567', signal);

		expect(checkAccount).toHaveBeenCalledWith({ phoneNumber: 375291234567 }, signal);
		expect(chat).toEqual({
			id: 'chat_123',
			name: '@anna',
			phone: '+375291234567',
			username: '@anna',
			messages: [],
		});
	});

	it('creates chat by @username when account exists', async () => {
		const { api, checkAccount } = createMockApi(vi.fn().mockResolvedValue({ exist: true, chatId: 'chat_456' }));
		const signal = new AbortController().signal;

		const chat = await createChat(api, '@durov', signal);

		expect(checkAccount).toHaveBeenCalledWith({ username: '@durov' }, signal);
		expect(chat).toEqual({
			id: 'chat_456',
			name: '@durov',
			phone: undefined,
			username: '@durov',
			messages: [],
		});
	});

	it('creates chat by username without @ and normalizes it', async () => {
		const { api, checkAccount } = createMockApi(
			vi.fn().mockResolvedValue({
				exist: true,
				chatId: 'chat_456',
				username: '@durov',
				phoneNumber: 79991234567,
			}),
		);
		const signal = new AbortController().signal;

		const chat = await createChat(api, 'durov', signal);

		expect(checkAccount).toHaveBeenCalledWith({ username: '@durov' }, signal);
		expect(chat).toEqual({
			id: 'chat_456',
			name: '@durov',
			phone: '+79991234567',
			username: '@durov',
			messages: [],
		});
	});

	it('throws a friendly error when user is not found in Telegram (exist: false)', async () => {
		const { api } = createMockApi(vi.fn().mockResolvedValue({ exist: false, chatId: '' }));

		await expect(createChat(api, '@unknown_user', new AbortController().signal)).rejects.toThrow(
			'Пользователь не найден в Telegram',
		);
	});

	it('throws a friendly error when account exists but chatId is missing', async () => {
		const { api } = createMockApi(vi.fn().mockResolvedValue({ exist: true, chatId: '' }));

		await expect(createChat(api, '+375291234567', new AbortController().signal)).rejects.toThrow(
			'Пользователь не найден в Telegram',
		);
	});
});
