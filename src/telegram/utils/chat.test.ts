import { describe, expect, it } from 'vitest';

import type { TNotification } from '@/api';

import { addMessage, applyNotification, getChatTitle } from './chat';

const incoming: TNotification = {
	receiptId: 1,
	body: {
		typeWebhook: 'incomingMessageReceived',
		idMessage: 'm1',
		timestamp: 100,
		senderData: { chatId: '123', chatName: 'Анна' },
		messageData: {
			typeMessage: 'textMessage',
			textMessageData: { textMessage: 'Привет' },
		},
	},
};
describe('Telegram chat state', () => {
	it('routes a phone-created chat reply using the resolved Telegram ID', () => {
		const chats = applyNotification([{ id: '123', phone: '+375291234567', name: 'Анна', messages: [] }], incoming);
		expect(chats).toHaveLength(1);
		expect(chats[0].messages[0].text).toBe('Привет');
		expect(chats[0].phone).toBe('+375291234567');
	});
	it('does not duplicate redelivered notifications', () => {
		const chats = applyNotification([], incoming);
		expect(applyNotification(chats, incoming)[0].messages).toHaveLength(1);
	});
	it('does not collapse identical message IDs from different chats', () => {
		const chats = applyNotification([], incoming);
		const second = structuredClone(incoming);
		second.body.senderData!.chatId = '456';
		expect(applyNotification(chats, second)).toHaveLength(2);
	});
	it('handles a text containing a link and skips unsupported media', () => {
		const n = structuredClone(incoming);
		n.body.messageData = {
			typeMessage: 'extendedTextMessage',
			extendedTextMessageData: { text: 'https://example.com' },
		};
		expect(applyNotification([], n)[0].messages[0].text).toBe('https://example.com');
		n.body.messageData = { typeMessage: 'imageMessage' };
		expect(applyNotification([], n)).toEqual([]);
	});
	it('applies delivery failures only to the matching outgoing message', () => {
		let chats = addMessage([], '123', {
			id: 'm1',
			text: 'Hi',
			time: 10,
			outgoing: true,
		});
		chats = addMessage(chats, '456', {
			id: 'm1',
			text: 'Other',
			time: 10,
			outgoing: true,
		});
		chats = applyNotification(chats, {
			receiptId: 2,
			body: {
				typeWebhook: 'outgoingMessageStatus',
				chatId: '123',
				idMessage: 'm1',
				status: 'failed',
			},
		});
		expect(chats.find((c) => c.id === '123')!.messages[0].status).toBe('failed');
		expect(chats.find((c) => c.id === '456')!.messages[0].status).toBeUndefined();
	});

	it('resolves chat display title prioritizing username with @, then phone/name', () => {
		expect(getChatTitle({ name: '@anna', username: '@anna' })).toBe('@anna');
		expect(getChatTitle({ name: 'anna', username: 'anna' })).toBe('@anna');
		expect(getChatTitle({ name: 'Анна', username: '@anna', phone: '+375291234567' })).toBe('@anna');
		expect(getChatTitle({ name: '+375291234567', phone: '+375291234567' })).toBe('+375291234567');
		expect(getChatTitle({ name: 'Анна' })).toBe('Анна');
		expect(getChatTitle({ name: '', phone: '+375291234567' })).toBe('+375291234567');
		expect(getChatTitle({ name: '' })).toBe('Чат');
	});
});
