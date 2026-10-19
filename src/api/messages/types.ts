import type { z } from 'zod';

import type { sendMessageResponseSchema } from './schemas';

export type TSendMessageRequest = {
	chatId: string;
	message: string;
};

export type TSendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
