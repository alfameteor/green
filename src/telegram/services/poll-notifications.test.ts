import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, createGreenApi } from '@/api';
import type { TGreenApi, TNotification } from '@/api';

import { pollNotifications } from './poll-notifications';
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});
describe('notification queue', () => {
	it('acknowledges only after processing, then stops on abort', async () => {
		const events: string[] = [];
		const controller = new AbortController();
		const fake = {
			notifications: {
				receiveNotification: vi.fn(
					async () => ({ receiptId: 7, body: { typeWebhook: 'unknown' } }) as TNotification,
				),
				deleteNotification: vi.fn(async () => {
					events.push('ack');
					controller.abort();
					return { result: true };
				}),
			},
		} as unknown as TGreenApi;
		await pollNotifications(fake, controller.signal, () => events.push('process'), vi.fn());
		expect(events).toEqual(['process', 'ack']);
		expect(fake.notifications.receiveNotification).toHaveBeenCalledTimes(1);
		expect(fake.notifications.deleteNotification).toHaveBeenCalledWith(7, controller.signal);
	});
	it('backs off on network failure and cancels the retry on logout', async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const receive = vi.fn().mockRejectedValue(new Error('Offline'));
		const report = vi.fn();
		const running = pollNotifications(
			{ notifications: { receiveNotification: receive } } as unknown as TGreenApi,
			controller.signal,
			vi.fn(),
			report,
		);
		await vi.advanceTimersByTimeAsync(1000);
		expect(receive).toHaveBeenCalledTimes(1);
		expect(report).toHaveBeenCalledWith('Offline');
		controller.abort();
		await running;
		await vi.advanceTimersByTimeAsync(30000);
		expect(receive).toHaveBeenCalledTimes(1);
	});
	it('retries deleteNotification with pending receiptId before receiving new notifications if ack fails', async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const processedReceipts: number[] = [];
		let deleteAttempts = 0;

		const fake = {
			notifications: {
				receiveNotification: vi.fn(async () => {
					return { receiptId: 42, body: { typeWebhook: 'unknown' } } as TNotification;
				}),
				deleteNotification: vi.fn(async () => {
					deleteAttempts += 1;
					if (deleteAttempts === 1) {
						throw new Error('Network error on delete');
					}
					controller.abort();
					return { result: true };
				}),
			},
		} as unknown as TGreenApi;

		const report = vi.fn();
		const running = pollNotifications(fake, controller.signal, (n) => processedReceipts.push(n.receiptId), report);

		await vi.advanceTimersByTimeAsync(3000);
		await running;

		expect(processedReceipts).toEqual([42]);
		expect(fake.notifications.receiveNotification).toHaveBeenCalledTimes(1);
		expect(fake.notifications.deleteNotification).toHaveBeenCalledTimes(2);
		expect(fake.notifications.deleteNotification).toHaveBeenNthCalledWith(1, 42, controller.signal);
		expect(fake.notifications.deleteNotification).toHaveBeenNthCalledWith(2, 42, controller.signal);
		expect(report).toHaveBeenCalledWith('Network error on delete');
	});
});

it('stops on malformed queue data without deleting it or retrying', async () => {
	const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ receiptId: 7, body: null })));
	vi.stubGlobal('fetch', fetch);
	const api = createGreenApi({
		apiUrl: 'https://4100.api.green-api.com',
		idInstance: '4100000',
		apiTokenInstance: 'test-token',
	});
	const process = vi.fn();
	const report = vi.fn();
	await pollNotifications(api, new AbortController().signal, process, report);
	expect(fetch).toHaveBeenCalledTimes(1);
	expect(process).not.toHaveBeenCalled();
	expect(report).toHaveBeenCalledWith(expect.stringContaining('Получение остановлено'));
});

it.each([401, 403])('stops polling after authorization error %i', async (status) => {
	const receive = vi.fn().mockRejectedValue(new ApiError('Access denied', status));
	const api = { notifications: { receiveNotification: receive } } as unknown as TGreenApi;
	await pollNotifications(api, new AbortController().signal, vi.fn(), vi.fn());
	expect(receive).toHaveBeenCalledTimes(1);
});

it('does not acknowledge when processing is interrupted by logout', async () => {
	const controller = new AbortController();
	const acknowledge = vi.fn();
	const api = {
		notifications: {
			receiveNotification: vi.fn().mockResolvedValue({ receiptId: 7, body: { typeWebhook: 'unknown' } }),
			deleteNotification: acknowledge,
		},
	} as unknown as TGreenApi;
	await pollNotifications(api, controller.signal, () => controller.abort(), vi.fn());
	expect(acknowledge).not.toHaveBeenCalled();
});
