// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { Providers } from '@/api/query-provider';

import { ConnectInstanceForm } from './index';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});
const mount = () =>
	render(
		<Providers>
			<ConnectInstanceForm onConnect={vi.fn()} />
		</Providers>,
	);

it('validates fields before making requests and focuses the first error', async () => {
	const fetch = vi.fn();
	vi.stubGlobal('fetch', fetch);
	mount();
	fireEvent.click(screen.getByRole('button', { name: 'Начать общение' }));
	const url = screen.getByRole('textbox', { name: 'API URL' });
	await screen.findByText('Укажите API URL.');
	await waitFor(() => expect(document.activeElement).toBe(url));
	expect(url.getAttribute('aria-invalid')).toBe('true');
	expect(document.getElementById(url.getAttribute('aria-describedby')!.split(' ').at(-1)!)?.textContent).toBe(
		'Укажите API URL.',
	);
	expect(fetch).not.toHaveBeenCalled();
	fireEvent.change(url, { target: { value: 'https://4100.api.green-api.com' } });
	await waitFor(() => expect(screen.queryByText('Укажите API URL.')).toBeNull());
});

it('keeps credentials after API failure and clears the request error on editing', async () => {
	const fetch = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
	vi.stubGlobal('fetch', fetch);
	mount();
	const url = screen.getByRole('textbox', { name: 'API URL' }) as HTMLInputElement;
	const id = screen.getByRole('textbox', { name: 'ID инстанса' }) as HTMLInputElement;
	const token = screen.getByLabelText('API токен') as HTMLInputElement;
	fireEvent.change(url, { target: { value: 'https://4100.api.green-api.com' } });
	fireEvent.change(id, { target: { value: '4100000' } });
	fireEvent.change(token, { target: { value: 'test-token' } });
	fireEvent.click(screen.getByRole('button', { name: 'Начать общение' }));
	await screen.findByText('Неверный idInstance или apiTokenInstance.');
	expect(url.value).toBe('https://4100.api.green-api.com');
	expect(id.value).toBe('4100000');
	expect(token.value).toBe('test-token');
	expect(token.readOnly).toBe(false);
	fireEvent.change(token, { target: { value: 'updated-token' } });
	await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
	expect(fetch).toHaveBeenCalledTimes(1);
});
