import { ApiError } from '@/api';

import type { TConnection, TQueueState } from '../types/connection';

export const isConnectionError = (error: unknown) =>
	error instanceof ApiError && ([401, 403].includes(error.status) || error.code === 'instance-unavailable');

export const getConnection = (queue: TQueueState, instanceState: string): TConnection => {
	if (queue.status === 'stopped') {
		return { status: 'stopped', label: 'Соединение остановлено', message: queue.message };
	}
	if (queue.status === 'checking') {
		return {
			status: 'checking',
			label: 'Проверяем подключение…',
			message: 'Проверяем состояние инстанса GREEN-API.',
		};
	}
	if (instanceState !== 'authorized') {
		const needsAuthorization = ['notAuthorized', 'pendingCode', 'pendingPassword'].includes(instanceState);
		return {
			status: needsAuthorization ? 'unauthorized' : 'unavailable',
			label: needsAuthorization ? 'Нужна авторизация' : 'Инстанс недоступен',
			message: needsAuthorization
				? 'Авторизуйте Telegram в кабинете GREEN-API, затем нажмите «Проверить подключение».'
				: 'Инстанс запускается или недоступен. Проверьте его состояние в кабинете GREEN-API.',
		};
	}
	if (queue.status === 'retrying') {
		return {
			status: 'reconnecting',
			label: 'Восстанавливаем соединение…',
			message: 'Связь с GREEN-API прервана. Повторяем подключение автоматически. Черновики сохранены.',
		};
	}
	return { status: 'connected', label: 'Telegram подключён', message: '' };
};
