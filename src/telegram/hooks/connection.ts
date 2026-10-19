import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import type { TGreenApi, TNotification } from '@/api';

import { createConnection } from '../services/connection';

type TOptions = {
	api: TGreenApi;
	onNotification: (notification: TNotification) => void;
};

export const useConnection = ({ api, onNotification }: TOptions) => {
	const queryClient = useQueryClient();
	const session = useMemo(
		() => createConnection({ api, queryClient, onNotification }),
		[api, queryClient, onNotification],
	);
	const connection = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
	useEffect(() => {
		session.start();
		return session.stop;
	}, [session]);
	return {
		connection,
		isAvailable: connection.status === 'connected',
		reconnect: session.reconnect,
		reportApiError: session.reportApiError,
	};
};
