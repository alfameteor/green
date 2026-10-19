import { queryOptions } from '@tanstack/react-query';

import type { TGreenApi } from '../create-green-api';

export const instanceStateQuery = (api: TGreenApi, sessionId: string) =>
	queryOptions({
		queryKey: ['instance-state', sessionId],
		queryFn: ({ signal }) => api.instance.getState(signal),
		staleTime: 0,
		gcTime: 0,
		retry: false,
		networkMode: 'always',
	});
