// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { TGreenApi, TNotification } from '@/api';
import { createQueryWrapper } from '@/common/utils/testing/query-wrapper';

import { useChats } from './chats';
afterEach(cleanup);
it('keeps receiving after Strict Mode setup/cleanup replay and aborts on logout', async () => {
	const signals: AbortSignal[] = [];
	let deliver: ((value: TNotification) => void) | undefined;
	const receive = vi.fn((signal: AbortSignal) => {
		signals.push(signal);
		return new Promise<TNotification>((resolve, reject) => {
			deliver = resolve;
			signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
		});
	});
	const acknowledge = vi.fn().mockResolvedValue({ result: true });
	const api = {
		notifications: { receiveNotification: receive, deleteNotification: acknowledge },
	} as unknown as TGreenApi;
	const QueryWrapper = createQueryWrapper();
	const { result, unmount } = renderHook(() => useChats(api), {
		wrapper: QueryWrapper,
		reactStrictMode: true,
	});
	expect(signals).toHaveLength(2);
	expect(signals[0].aborted).toBe(true);
	expect(signals[1].aborted).toBe(false);
	await act(async () => {
		deliver!({
			receiptId: 7,
			body: {
				typeWebhook: 'incomingMessageReceived',
				idMessage: '1',
				senderData: { chatId: '123' },
				messageData: {
					typeMessage: 'textMessage',
					textMessageData: { textMessage: 'Ответ' },
				},
			},
		});
	});
	await waitFor(() => expect(result.current.chats[0]?.messages[0]?.text).toBe('Ответ'));
	expect(acknowledge).toHaveBeenCalledWith(7, signals[1]);
	unmount();
	expect(signals[1].aborted).toBe(true);
});
