'use client';

import { useState } from 'react';

import type { TGreenApi, TCredentials } from '@/api';

export type TSession = {
	credentials: TCredentials;
	api: TGreenApi;
};

export const useSession = () => {
	const [session, setSession] = useState<TSession | null>(null);
	return {
		session,
		connect: (credentials: TCredentials, api: TGreenApi) => setSession({ credentials, api }),
		disconnect: () => setSession(null),
	};
};
