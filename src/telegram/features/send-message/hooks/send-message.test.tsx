// @vitest-environment jsdom
import { act, renderHook, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import type { TGreenApi } from '@/api';
import { createQueryWrapper } from '@/common/utils/testing/query-wrapper';

import { useSendMessage } from './send-message';
afterEach(cleanup);
it('finishes sending to the original chat after the page rerenders', async () => {
	let resolve!: (value: { idMessage: string }) => void;
	const sendMessage = vi.fn(
		() =>
			new Promise<{
				idMessage: string;
			}>((complete) => {
				resolve = complete;
			}),
	);
	const api = { messages: { sendMessage } } as unknown as TGreenApi;
	const onSent = vi.fn();
	const { result, rerender } = renderHook(() => useSendMessage(api, onSent), { wrapper: createQueryWrapper() });
	act(() => result.current.handleSend('original-chat', 'Привет'));
	await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
	rerender();
	await act(async () => resolve({ idMessage: '42' }));
	await waitFor(() =>
		expect(onSent).toHaveBeenCalledWith('original-chat', expect.objectContaining({ id: '42', text: 'Привет' })),
	);
	await waitFor(() => expect(result.current.isSending).toBe(false));
});
it('reports a failure without automatically retrying a possibly delivered message', async () => {
	const sendMessage = vi.fn().mockRejectedValue(new Error('Offline'));
	const api = { messages: { sendMessage } } as unknown as TGreenApi;
	const { result } = renderHook(() => useSendMessage(api, vi.fn()), { wrapper: createQueryWrapper() });
	act(() => result.current.handleSend('123', 'Привет'));
	await waitFor(() => expect(result.current.errors['123']).toContain('Текст сохранён'));
	expect(sendMessage).toHaveBeenCalledTimes(1);
});
it('aborts on logout and does not update the old session after a late response', async () => {
	let resolve!: (value: { idMessage: string }) => void;
	let signal!: AbortSignal;
	const sendMessage = vi.fn((_data, requestSignal) => {
		signal = requestSignal;
		return new Promise<{
			idMessage: string;
		}>((complete) => {
			resolve = complete;
		});
	});
	const onSent = vi.fn();
	const { result, unmount } = renderHook(
		() => useSendMessage({ messages: { sendMessage } } as unknown as TGreenApi, onSent),
		{ wrapper: createQueryWrapper() },
	);
	act(() => result.current.handleSend('123', 'Привет'));
	await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
	unmount();
	expect(signal.aborted).toBe(true);
	await act(async () => resolve({ idMessage: '42' }));
	expect(onSent).not.toHaveBeenCalled();
});

it('allows sending messages to different chats concurrently without blocking or throwing', async () => {
	let resolveChat1!: (value: { idMessage: string }) => void;
	let resolveChat2!: (value: { idMessage: string }) => void;

	const sendMessage = vi.fn((data: { chatId: string; message: string }) => {
		if (data.chatId === 'chat-1') {
			return new Promise<{ idMessage: string }>((resolve) => {
				resolveChat1 = resolve;
			});
		}
		return new Promise<{ idMessage: string }>((resolve) => {
			resolveChat2 = resolve;
		});
	});

	const api = { messages: { sendMessage } } as unknown as TGreenApi;
	const onSent = vi.fn();
	const { result } = renderHook(() => useSendMessage(api, onSent), { wrapper: createQueryWrapper() });

	act(() => result.current.handleSend('chat-1', 'Сообщение 1'));
	await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
	expect(result.current.isChatSending('chat-1')).toBe(true);
	expect(result.current.isChatSending('chat-2')).toBe(false);

	act(() => result.current.handleSend('chat-2', 'Сообщение 2'));
	await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
	expect(result.current.isChatSending('chat-2')).toBe(true);

	await act(async () => resolveChat1({ idMessage: 'msg-1' }));
	await waitFor(() => expect(result.current.isChatSending('chat-1')).toBe(false));
	expect(result.current.isChatSending('chat-2')).toBe(true);
	expect(onSent).toHaveBeenCalledWith('chat-1', expect.objectContaining({ id: 'msg-1', text: 'Сообщение 1' }));

	await act(async () => resolveChat2({ idMessage: 'msg-2' }));
	await waitFor(() => expect(result.current.isChatSending('chat-2')).toBe(false));
	expect(onSent).toHaveBeenCalledWith('chat-2', expect.objectContaining({ id: 'msg-2', text: 'Сообщение 2' }));
});
