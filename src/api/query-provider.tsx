'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

type TProps = {
	children: ReactNode;
};

export const Providers = ({ children }: TProps) => {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: { retry: false, refetchOnWindowFocus: false },
					mutations: { retry: false, networkMode: 'always', gcTime: 0 },
				},
			}),
	);
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
