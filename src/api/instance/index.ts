import type { TApiRequest } from '../types';
import { instanceStateSchema, instanceSettingsSchema } from './schemas';

export const createInstanceApi = (request: TApiRequest) => ({
	getState: (signal?: AbortSignal) => request({ endpoint: 'getStateInstance', schema: instanceStateSchema, signal }),
	getSettings: (signal?: AbortSignal) => request({ endpoint: 'getSettings', schema: instanceSettingsSchema, signal }),
});
