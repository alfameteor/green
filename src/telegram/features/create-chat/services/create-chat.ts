import type { TGreenApi } from '@/api';
import type { TChat } from '@/telegram/types/chat';

import { parseContact } from '../utils/validate-contact';

export const createChat = async (api: TGreenApi, contactInput: string, signal: AbortSignal): Promise<TChat> => {
	const parsed = parseContact(contactInput);
	const requestData = parsed.type === 'phone' ? { phoneNumber: parsed.phoneNumber } : { username: parsed.username };
	const contact = await api.contacts.checkAccount(requestData, signal);
	if (!contact.exist || !contact.chatId) {
		throw new Error('Пользователь не найден в Telegram');
	}

	const formattedUsername = contact.username
		? contact.username.startsWith('@')
			? contact.username
			: `@${contact.username}`
		: parsed.type === 'username'
			? parsed.username
			: undefined;

	const formattedPhone = contact.phoneNumber
		? `+${contact.phoneNumber}`
		: parsed.type === 'phone'
			? parsed.phone
			: undefined;

	return {
		id: String(contact.chatId),
		name: formattedUsername || formattedPhone || String(contact.chatId),
		phone: formattedPhone,
		username: formattedUsername,
		messages: [],
	};
};
