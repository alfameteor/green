import { z } from 'zod';

export const instanceStateSchema = z.object({ stateInstance: z.string().min(1) });
export const instanceSettingsSchema = z.object({
	typeInstance: z.string().min(1),
	webhookUrl: z.string(),
	incomingWebhook: z.enum(['yes', 'no']),
	outgoingWebhook: z.enum(['yes', 'no']),
	stateWebhook: z.enum(['yes', 'no']),
});
