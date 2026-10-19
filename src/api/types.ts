import type { z } from 'zod';

export type TCredentials = {
	apiUrl: string;
	idInstance: string;
	apiTokenInstance: string;
};

export type TRequestOptions<TResponse = unknown> = {
	schema: z.ZodType<TResponse>;
	endpoint: string;
	method?: 'GET' | 'POST' | 'DELETE';
	body?: unknown;
	signal?: AbortSignal;
	path?: string;
	query?: Record<string, string>;
};

export type TApiRequest = <TResponse>(options: TRequestOptions<TResponse>) => Promise<TResponse>;

export type TApiRequestConfig = {
	useProxy?: boolean;
};
