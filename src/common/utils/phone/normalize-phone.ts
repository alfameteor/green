export const normalizePhone = (value: string): string => {
	if (!/^\+?[\d\s()-]+$/.test(value.trim())) {
		throw new Error('Введите номер телефона с кодом страны.');
	}
	const digits = value.replace(/\D/g, '');
	if (!/^[1-9]\d{6,14}$/.test(digits)) {
		throw new Error('Номер должен содержать от 7 до 15 цифр, включая код страны.');
	}
	return digits;
};
