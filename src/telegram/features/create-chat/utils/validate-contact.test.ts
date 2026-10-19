import { describe, expect, it } from 'vitest';

import { normalizeUsername, parseContact } from './validate-contact';

describe('normalizeUsername', () => {
	it('normalizes a valid username with @ prefix', () => {
		expect(normalizeUsername('@durov')).toBe('@durov');
		expect(normalizeUsername('  @durov  ')).toBe('@durov');
		expect(normalizeUsername('@user_123')).toBe('@user_123');
	});

	it('adds @ prefix to a valid username without @', () => {
		expect(normalizeUsername('durov')).toBe('@durov');
		expect(normalizeUsername('  durov  ')).toBe('@durov');
		expect(normalizeUsername('user_123')).toBe('@user_123');
	});

	it('accepts boundary username lengths (5 and 32 characters)', () => {
		expect(normalizeUsername('a'.repeat(5))).toBe(`@${'a'.repeat(5)}`);
		expect(normalizeUsername(`@${'b'.repeat(32)}`)).toBe(`@${'b'.repeat(32)}`);
	});

	it.each([
		'user',
		'@user',
		'abc',
		'@abc',
		'a'.repeat(33),
		`@${'a'.repeat(33)}`,
		'@user-name',
		'user-name',
		'@user.name',
		'@user!name',
		'@',
		'',
	])('rejects invalid username %s', (value) => {
		expect(() => normalizeUsername(value)).toThrow(
			'Юзернейм должен содержать от 5 до 32 символов (латиница, цифры, подчёркивание).',
		);
	});
});

describe('parseContact', () => {
	it('parses valid phone numbers', () => {
		expect(parseContact('+375 29 123 45 67')).toEqual({
			type: 'phone',
			phone: '+375291234567',
			phoneNumber: 375291234567,
		});
		expect(parseContact('+7 (999) 123-45-67')).toEqual({
			type: 'phone',
			phone: '+79991234567',
			phoneNumber: 79991234567,
		});
		expect(parseContact('375291234567')).toEqual({
			type: 'phone',
			phone: '+375291234567',
			phoneNumber: 375291234567,
		});
	});

	it('parses valid usernames with @ prefix', () => {
		expect(parseContact('@durov')).toEqual({
			type: 'username',
			username: '@durov',
		});
		expect(parseContact('@user_123')).toEqual({
			type: 'username',
			username: '@user_123',
		});
	});

	it('parses and normalizes valid usernames without @ prefix', () => {
		expect(parseContact('durov')).toEqual({
			type: 'username',
			username: '@durov',
		});
		expect(parseContact('user_123')).toEqual({
			type: 'username',
			username: '@user_123',
		});
	});

	it('rejects empty input', () => {
		expect(() => parseContact('')).toThrow('Укажите номер телефона или @username.');
		expect(() => parseContact('   ')).toThrow('Укажите номер телефона или @username.');
	});

	it('rejects invalid phone numbers', () => {
		expect(() => parseContact('123')).toThrow('Номер должен содержать от 7 до 15 цифр, включая код страны.');
		expect(() => parseContact('+123')).toThrow('Номер должен содержать от 7 до 15 цифр, включая код страны.');
	});

	it('rejects invalid usernames', () => {
		expect(() => parseContact('@abc')).toThrow(
			'Юзернейм должен содержать от 5 до 32 символов (латиница, цифры, подчёркивание).',
		);
		expect(() => parseContact('abc')).toThrow(
			'Юзернейм должен содержать от 5 до 32 символов (латиница, цифры, подчёркивание).',
		);
		expect(() => parseContact('@user-name')).toThrow(
			'Юзернейм должен содержать от 5 до 32 символов (латиница, цифры, подчёркивание).',
		);
	});
});
