import { normalizePhone } from '@/common/utils/phone';

export type TParsedContact =
	| { type: 'phone'; phone: string; phoneNumber: number }
	| { type: 'username'; username: string };

export const normalizeUsername = (value: string): string => {
	const trimmed = value.trim();
	const core = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
	if (!/^[a-zA-Z0-9_]{5,32}$/.test(core)) {
		throw new Error('Юзернейм должен содержать от 5 до 32 символов (латиница, цифры, подчёркивание).');
	}
	return `@${core}`;
};

export const parseContact = (value: string): TParsedContact => {
	const trimmed = value.trim();
	if (!trimmed) {
		throw new Error('Укажите номер телефона или @username.');
	}
	if (trimmed.startsWith('@')) {
		return { type: 'username', username: normalizeUsername(trimmed) };
	}
	if (trimmed.startsWith('+')) {
		const digits = normalizePhone(trimmed);
		return { type: 'phone', phone: `+${digits}`, phoneNumber: Number(digits) };
	}
	if (/[a-zA-Z_]/.test(trimmed)) {
		return { type: 'username', username: normalizeUsername(trimmed) };
	}
	const digits = normalizePhone(trimmed);
	return { type: 'phone', phone: `+${digits}`, phoneNumber: Number(digits) };
};
