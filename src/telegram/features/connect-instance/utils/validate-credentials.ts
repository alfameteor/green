import type { TCredentials } from '@/api';

export const normalizeApiUrl = (value: string): string => {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error('Укажите apiUrl из личного кабинета GREEN-API.');
	}
	if (
		url.protocol !== 'https:' ||
		!/^(?:[a-z0-9-]+\.)*green-api\.com$/.test(url.hostname) ||
		url.port ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== '/'
	) {
		throw new Error('apiUrl должен быть HTTPS-адресом сервера green-api.com без пути и параметров.');
	}
	return url.origin;
};
export const normalizeInstanceId = (value: string): string => {
	const idInstance = value.trim();
	if (!/^\d+$/.test(idInstance)) {
		throw new Error('idInstance должен содержать только цифры.');
	}
	return idInstance;
};
export const normalizeApiToken = (value: string): string => {
	const apiTokenInstance = value.trim();
	if (!/^[a-zA-Z0-9_-]+$/.test(apiTokenInstance)) {
		throw new Error('Проверьте apiTokenInstance: он не должен содержать пробелы.');
	}
	return apiTokenInstance;
};
export const validateCredentials = (input: TCredentials): TCredentials => ({
	apiUrl: normalizeApiUrl(input.apiUrl),
	idInstance: normalizeInstanceId(input.idInstance),
	apiTokenInstance: normalizeApiToken(input.apiTokenInstance),
});
