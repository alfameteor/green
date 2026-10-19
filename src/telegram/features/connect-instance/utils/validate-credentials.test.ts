import { describe, expect, it } from 'vitest';

import { normalizePhone } from '@/common/utils/phone';

import { validateCredentials } from './validate-credentials';
describe('input validation', () => {
	it('normalizes an international phone number', () => {
		expect(normalizePhone('+375 (29) 123-45-67')).toBe('375291234567');
	});
	it.each(['abc1234567', '123', '+00000000'])('rejects invalid phone %s', (value) => {
		expect(() => normalizePhone(value)).toThrow();
	});
	it('does not send credentials to an arbitrary host', () => {
		for (const apiUrl of [
			'https://green-api.com.evil.test',
			'http://4100.api.green-api.com',
			'https://green-api.com/path',
			'https://user:pass@green-api.com',
		]) {
			expect(() =>
				validateCredentials({
					apiUrl,
					idInstance: '4100000',
					apiTokenInstance: 'secret',
				}),
			).toThrow();
		}
	});
});
