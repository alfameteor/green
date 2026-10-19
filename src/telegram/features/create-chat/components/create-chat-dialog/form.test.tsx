// @vitest-environment jsdom
import { useState } from 'react';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { TGreenApi } from '@/api';
import { Providers } from '@/api/query-provider';

import { CreateChatDialog } from './index';

afterEach(cleanup);
const setup = (checkAccount = vi.fn().mockRejectedValue(new Error('Сеть недоступна')), onCreated = vi.fn()) => {
	const api = { contacts: { checkAccount } } as unknown as TGreenApi;
	const Host = () => {
		const [open, setOpen] = useState(false);
		return (
			<Providers>
				<button onClick={() => setOpen(true)}>Открыть</button>
				{open && <CreateChatDialog api={api} onCreated={onCreated} onClose={() => setOpen(false)} />}
			</Providers>
		);
	};
	render(<Host />);
	const opener = screen.getByRole('button', { name: 'Открыть' });
	opener.focus();
	fireEvent.click(opener);
	return { opener, checkAccount, onCreated };
};

it('focuses the input, hides the background from assistive technology, and restores focus on Escape', async () => {
	const { opener } = setup();
	const input = await screen.findByRole('textbox', { name: 'Номер телефона или @username' });
	await waitFor(() => expect(document.activeElement).toBe(input));
	expect(screen.queryByRole('button', { name: 'Открыть' })).toBeNull();
	fireEvent.keyDown(input, { key: 'Escape' });
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	await waitFor(() => expect(document.activeElement).toBe(opener));
});

it('validates phone and username locally and preserves value after a failed request', async () => {
	const { checkAccount } = setup();
	const input = screen.getByRole('textbox', { name: 'Номер телефона или @username' }) as HTMLInputElement;

	fireEvent.change(input, { target: { value: '123' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
	await screen.findByText('Номер должен содержать от 7 до 15 цифр, включая код страны.');
	expect(checkAccount).not.toHaveBeenCalled();

	fireEvent.change(input, { target: { value: '@abc' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
	await screen.findByText('Юзернейм должен содержать от 5 до 32 символов (латиница, цифры, подчёркивание).');
	expect(checkAccount).not.toHaveBeenCalled();

	fireEvent.change(input, { target: { value: '+375291234567' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
	await screen.findByText('Сеть недоступна');
	expect(input.value).toBe('+375291234567');
	expect(input.readOnly).toBe(false);
});

it('creates chat by @username and normalizes username without @', async () => {
	const checkAccount = vi.fn().mockResolvedValue({ exist: true, chatId: 'chat_1', username: '@durov' });
	const onCreated = vi.fn();
	setup(checkAccount, onCreated);

	const input = screen.getByRole('textbox', { name: 'Номер телефона или @username' }) as HTMLInputElement;
	fireEvent.change(input, { target: { value: 'durov' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));

	await waitFor(() => expect(checkAccount).toHaveBeenCalledWith({ username: '@durov' }, expect.any(AbortSignal)));
	await waitFor(() =>
		expect(onCreated).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'chat_1', name: '@durov', username: '@durov' }),
		),
	);
});

it('shows a friendly error when user is not found in Telegram', async () => {
	const checkAccount = vi.fn().mockResolvedValue({ exist: false, chatId: '' });
	setup(checkAccount);

	const input = screen.getByRole('textbox', { name: 'Номер телефона или @username' }) as HTMLInputElement;
	fireEvent.change(input, { target: { value: '@not_found' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));

	await screen.findByText('Пользователь не найден в Telegram');
	expect(input.value).toBe('@not_found');
});

it('keeps the input focused and prevents closing or duplicate submission while busy', async () => {
	let rejectRequest: ((error: Error) => void) | undefined;
	const request = vi.fn(
		() =>
			new Promise((_, reject) => {
				rejectRequest = reject;
			}),
	);
	setup(request);
	const input = screen.getByRole('textbox', { name: 'Номер телефона или @username' }) as HTMLInputElement;
	fireEvent.change(input, { target: { value: '+375291234567' } });
	fireEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
	await screen.findByRole('button', { name: 'Ищем аккаунт…' });
	expect(input.readOnly).toBe(true);
	expect(input.disabled).toBe(false);
	fireEvent.keyDown(input, { key: 'Escape' });
	fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
	expect(screen.getByRole('dialog')).toBeTruthy();
	expect(request).toHaveBeenCalledTimes(1);
	await act(async () => {
		rejectRequest?.(new Error('Сеть недоступна'));
	});
	fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
