import { z } from 'zod';

export const contactSchema = z.discriminatedUnion('exist', [
	z.object({
		exist: z.literal(true),
		chatId: z.string().min(1),
		username: z.string().optional(),
		phoneNumber: z.number().optional(),
	}),
	z.object({
		exist: z.literal(false),
		chatId: z.string().optional(),
		username: z.string().optional(),
		phoneNumber: z.number().optional(),
	}),
]);

export const checkAccountResponseSchema = z.union([
	z.object({
		status: z.literal(false),
		reason: z.string().optional(),
		data: z.object({ reason: z.string(), retryAfter: z.number().nonnegative().optional() }).optional(),
	}),
	contactSchema,
]);
