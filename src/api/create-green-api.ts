import { createApiRequest } from './client';
import { createContactsApi } from './contacts';
import { createInstanceApi } from './instance';
import { createMessagesApi } from './messages';
import { createNotificationsApi } from './notifications';
import type { TApiRequestConfig, TCredentials } from './types';

export const createGreenApi = (credentials: TCredentials, config?: TApiRequestConfig) => {
	const request = createApiRequest(credentials, config);
	return {
		instance: createInstanceApi(request),
		contacts: createContactsApi(request),
		messages: createMessagesApi(request),
		notifications: createNotificationsApi(request),
	};
};

export type TGreenApi = ReturnType<typeof createGreenApi>;
