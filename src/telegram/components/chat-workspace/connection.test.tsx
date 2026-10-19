// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { ApiError } from '@/api';
import type { TGreenApi } from '@/api';
import { Providers } from '@/api/query-provider';

import { ChatWorkspace } from './index';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it('preserves messages and an editable draft while sending is blocked, then restores access', async () => {
	let failPoll: ((error: Error) => void) | undefined;
	const receive = vi.fn(
		(signal: AbortSignal) =>
			new Promise((_, reject) => {
				failPoll = reject;
				signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
					once: true,
				});
			}),
	);
	const send = vi.fn().mockResolvedValue({ idMessage: 'outgoing-1' });
	const getState = vi.fn().mockResolvedValue({ stateInstance: 'authorized' });
	const api = {
		instance: { getState },
		notifications: { receiveNotification: receive, deleteNotification: vi.fn() },
		contacts: { checkAccount: vi.fn().mockResolvedValue({ exist: true, chatId: '123', username: '@anna' }) },
		messages: { sendMessage: send },
	} as unknown as TGreenApi;
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true });
	const logout = vi.fn();
	render(
		<Providers>
			<ChatWorkspace api={api} instance="4100000" onLogout={logout} />
		</Providers>,
	);
	fireEvent.click(screen.getAllByRole('button', { name: 'Новый чат' })[0]);
	fireEvent.change(screen.getByRole('textbox', { name: /^Номер телефона/ }), { target: { value: '+375291234567' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	const composer = screen.getByRole('textbox', { name: 'Сообщение' }) as HTMLTextAreaElement;
	fireEvent.change(composer, { target: { value: 'Sent message' } });
	fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
	await within(screen.getByRole('log')).findByText('Sent message');
	await waitFor(() => expect(composer.value).toBe(''));
	fireEvent.change(composer, { target: { value: 'Saved draft' } });
	await act(async () => {
		failPoll?.(new ApiError('Доступ потерян', 401));
	});
	const sendButton = screen.getByRole('button', { name: 'Отправить сообщение' }) as HTMLButtonElement;
	expect(sendButton.disabled).toBe(true);
	expect((screen.getByRole('button', { name: 'Новый чат' }) as HTMLButtonElement).disabled).toBe(true);
	expect(composer.disabled).toBe(false);
	expect(composer.value).toBe('Saved draft');
	fireEvent.change(composer, { target: { value: 'Edited offline' } });
	fireEvent.keyDown(composer, { key: 'Enter' });
	expect(send).toHaveBeenCalledTimes(1);
	fireEvent.click(screen.getByRole('button', { name: 'Проверить подключение' }));
	await waitFor(() => expect(sendButton.disabled).toBe(false));
	expect(getState).toHaveBeenCalledTimes(1);
	expect(receive).toHaveBeenCalledTimes(2);
	expect(composer.value).toBe('Edited offline');
	expect(within(screen.getByRole('log')).getByText('Sent message')).toBeTruthy();
	expect(logout).not.toHaveBeenCalled();
});
