import type { z } from 'zod';

import type { contactSchema } from './schemas';

export type TCheckAccountRequest = { phoneNumber: number } | { username: string };
export type TCheckAccountResponse = z.infer<typeof contactSchema>;
