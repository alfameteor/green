import type { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api';
import type { TGreenApi, TNotification } from '@/api';
import { instanceStateQuery } from '@/api/instance/queries';

import type { TQueueState } from '../types/connection';
import { getConnection, isConnectionError } from '../utils/connection';
import { pollNotifications } from './poll-notifications';

type TOptions = {
	api: TGreenApi;
	queryClient: QueryClient;
	onNotification: (notification: TNotification) => void;
};

// Owns one mounted connection. React only subscribes and starts/stops its lifetime.
export const createConnection = ({ api, queryClient, onNotification }: TOptions) => {
	const stateQuery = instanceStateQuery(api, crypto.randomUUID());
	const listeners = new Set<() => void>();
	let queue: TQueueState = { status: 'ready', message: '' };
	let instanceState = 'authorized';
	let snapshot = getConnection(queue, instanceState);
	let isActive = false;
	let recovery: symbol | null = null;
	let consumer: AbortController | null = null;

	const publish = () => {
		snapshot = getConnection(queue, instanceState);
		listeners.forEach((listener) => listener());
	};
	const setQueue = (next: TQueueState) => {
		queue = next;
		publish();
	};
	const stopConsumer = () => {
		consumer?.abort();
		consumer = null;
	};
	const cancelRecovery = () => {
		recovery = null;
		void queryClient.cancelQueries({ queryKey: stateQuery.queryKey, exact: true });
	};
	const startConsumer = () => {
		stopConsumer();
		const controller = new AbortController();
		consumer = controller;
		void pollNotifications(
			api,
			controller.signal,
			(notification) => {
				if (notification.body.typeWebhook === 'stateInstanceChanged' && notification.body.stateInstance) {
					instanceState = notification.body.stateInstance;
					publish();
				}
				onNotification(notification);
			},
			(message) => setQueue({ status: message ? 'retrying' : 'ready', message }),
			(message) => setQueue({ status: 'stopped', message }),
		);
	};
	const start = () => {
		if (isActive) {
			return;
		}
		isActive = true;
		startConsumer();
	};
	const stop = () => {
		isActive = false;
		stopConsumer();
		cancelRecovery();
		queryClient.removeQueries({ queryKey: stateQuery.queryKey, exact: true });
	};
	const reconnect = async () => {
		if (!isActive || recovery) {
			return;
		}
		stopConsumer();
		const currentRecovery = Symbol('recovery');
		recovery = currentRecovery;
		setQueue({ status: 'checking', message: '' });
		try {
			const state = await queryClient.fetchQuery(stateQuery);
			if (recovery !== currentRecovery) {
				return;
			}
			instanceState = state.stateInstance;
			setQueue({ status: 'ready', message: '' });
			startConsumer();
		} catch (error) {
			if (recovery !== currentRecovery) {
				return;
			}
			setQueue({
				status: 'stopped',
				message:
					error instanceof ApiError
						? error.message
						: 'Не удалось проверить подключение. Проверьте сеть и повторите попытку.',
			});
		} finally {
			if (recovery === currentRecovery) {
				recovery = null;
			}
		}
	};
	const reportApiError = (error: unknown) => {
		if (!isActive || !isConnectionError(error)) {
			return;
		}
		stopConsumer();
		cancelRecovery();
		setQueue({
			status: 'stopped',
			message:
				'Доступ к инстансу потерян. Проверьте авторизацию и токен в GREEN-API. Для другого токена выйдите и подключитесь заново.',
		});
	};
	return {
		start,
		stop,
		reconnect,
		reportApiError,
		getSnapshot: () => snapshot,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};
