import { z } from 'zod';

export const sendMessageResponseSchema = z.object({ idMessage: z.string().min(1) });
