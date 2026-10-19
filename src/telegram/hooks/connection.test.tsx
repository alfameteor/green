// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { ApiError } from '@/api';
import type { TGreenApi, TNotification } from '@/api';
import { createQueryWrapper } from '@/common/utils/testing/query-wrapper';

import { useConnection } from './connection';

const stateEvent = (stateInstance: string): TNotification => ({
	receiptId: 7,
	body: { typeWebhook: 'stateInstanceChanged', stateInstance },
});
const makeApi = () => {
	const receive = vi.fn<(signal: AbortSignal) => Promise<TNotification | null>>().mockResolvedValue(null);
	const getState = vi.fn().mockResolvedValue({ stateInstance: 'authorized' });
	const api = {
		notifications: {
			receiveNotification: receive,
			deleteNotification: vi.fn().mockResolvedValue({ result: true }),
		},
		instance: { getState },
	} as unknown as TGreenApi;
	return { api, receive, getState };
};
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

it('does not confuse a successful poll with restored Telegram authorization', async () => {
	vi.useFakeTimers();
	const { api, receive } = makeApi();
	receive
		.mockResolvedValueOnce(stateEvent('notAuthorized'))
		.mockResolvedValueOnce(null)
		.mockResolvedValueOnce(stateEvent('authorized'));
	const onNotification = vi.fn();
	const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(result.current.connection.status).toBe('unauthorized');
	expect(result.current.isAvailable).toBe(false);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(1050);
	});
	expect(result.current.connection.status).toBe('unauthorized');
	await act(async () => {
		await vi.advanceTimersByTimeAsync(1050);
	});
	expect(result.current.isAvailable).toBe(true);
});

it('recovers automatically from a transient receive failure', async () => {
	vi.useFakeTimers();
	const { api, receive } = makeApi();
	receive.mockRejectedValueOnce(new Error('Offline'));
	const onNotification = vi.fn();
	const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
	await act(async () => {
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(result.current.connection.status).toBe('reconnecting');
	expect(result.current.isAvailable).toBe(false);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(2000);
	});
	expect(result.current.isAvailable).toBe(true);
});

it.each([new ApiError('Unauthorized', 401), new ApiError('Invalid response', 200, 'protocol')])(
	'requires manual recovery after a terminal receive failure',
	async (error) => {
		vi.useFakeTimers();
		const { api, receive, getState } = makeApi();
		receive.mockRejectedValueOnce(error);
		const onNotification = vi.fn();
		const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(result.current.connection.status).toBe('stopped');
		expect(receive).toHaveBeenCalledTimes(1);
		await act(async () => {
			result.current.reconnect();
			result.current.reconnect();
		});
		expect(getState).toHaveBeenCalledTimes(1);
		expect(result.current.isAvailable).toBe(true);
		expect(receive).toHaveBeenCalledTimes(2);
	},
);

it('aborts the current consumer when an operation reports lost access', async () => {
	const { api, receive } = makeApi();
	let queueSignal: AbortSignal | undefined;
	receive.mockImplementation((signal) => {
		queueSignal = signal;
		return new Promise((_, reject) =>
			signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }),
		);
	});
	const onNotification = vi.fn();
	const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
	await act(async () => {
		result.current.reportApiError(new ApiError('No access', 403));
	});
	expect(queueSignal?.aborted).toBe(true);
	expect(result.current.connection.status).toBe('stopped');
	expect(result.current.isAvailable).toBe(false);
});

it('ignores a late state response after logout', async () => {
	const { api, getState } = makeApi();
	let resolveState: ((value: { stateInstance: string }) => void) | undefined;
	getState.mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveState = resolve;
			}),
	);
	const onNotification = vi.fn();
	const { result, unmount } = renderHook(() => useConnection({ api, onNotification }), {
		wrapper: createQueryWrapper(),
	});
	await act(async () => {
		result.current.reconnect();
	});
	const signal = getState.mock.calls[0][0] as AbortSignal;
	unmount();
	expect(signal.aborted).toBe(true);
	await act(async () => {
		resolveState?.({ stateInstance: 'authorized' });
	});
	expect(onNotification).not.toHaveBeenCalled();
});

it('keeps the connection stopped when access is lost during a state check', async () => {
	const { api, getState, receive } = makeApi();
	let resolveState!: (state: { stateInstance: string }) => void;
	getState.mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveState = resolve;
			}),
	);
	const onNotification = vi.fn();
	const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
	await act(async () => {
		void result.current.reconnect();
	});
	const signal = getState.mock.calls[0][0] as AbortSignal;
	expect(result.current.connection.status).toBe('checking');
	await act(async () => {
		result.current.reportApiError(new ApiError('No access', 403));
	});
	expect(signal.aborted).toBe(true);
	await act(async () => {
		resolveState({ stateInstance: 'authorized' });
	});
	expect(result.current.connection.status).toBe('stopped');
	expect(receive).toHaveBeenCalledTimes(1);
});

it('allows another recovery after the state request fails without starting a consumer', async () => {
	const { api, getState, receive } = makeApi();
	getState.mockRejectedValueOnce(new Error('Offline'));
	const onNotification = vi.fn();
	const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
	await act(async () => {
		await result.current.reconnect();
	});
	expect(result.current.connection.status).toBe('stopped');
	expect(receive).toHaveBeenCalledTimes(1);
	await act(async () => {
		await result.current.reconnect();
	});
	expect(getState).toHaveBeenCalledTimes(2);
	expect(result.current.isAvailable).toBe(true);
	expect(receive).toHaveBeenCalledTimes(2);
});

it('does not deliver or acknowledge a late notification from the replaced consumer', async () => {
	const { api, receive } = makeApi();
	let resolveNotification!: (event: TNotification) => void;
	receive.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				resolveNotification = resolve;
			}),
	);
	const onNotification = vi.fn();
	const { result } = renderHook(() => useConnection({ api, onNotification }), { wrapper: createQueryWrapper() });
	await act(async () => {
		await result.current.reconnect();
	});
	await act(async () => {
		resolveNotification(stateEvent('notAuthorized'));
	});
	expect(onNotification).not.toHaveBeenCalled();
	expect(api.notifications.deleteNotification).not.toHaveBeenCalled();
	expect(result.current.isAvailable).toBe(true);
});

it('isolates state queries when the API session changes during recovery', async () => {
	const first = makeApi();
	const second = makeApi();
	let resolveOldState!: (state: { stateInstance: string }) => void;
	first.getState.mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveOldState = resolve;
			}),
	);
	const onNotification = vi.fn();
	const { result, rerender } = renderHook(({ api }) => useConnection({ api, onNotification }), {
		wrapper: createQueryWrapper(),
		initialProps: { api: first.api },
	});
	await act(async () => {
		void result.current.reconnect();
	});
	const oldSignal = first.getState.mock.calls[0][0] as AbortSignal;
	rerender({ api: second.api });
	expect(oldSignal.aborted).toBe(true);
	await act(async () => {
		await result.current.reconnect();
		resolveOldState({ stateInstance: 'notAuthorized' });
	});
	expect(second.getState).toHaveBeenCalledTimes(1);
	expect(result.current.isAvailable).toBe(true);
	expect(first.receive).toHaveBeenCalledTimes(1);
});
