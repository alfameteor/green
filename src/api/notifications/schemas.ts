import { z } from 'zod';

const notificationBodySchema = z
	.object({
		typeWebhook: z.string().min(1),
		timestamp: z.number().nonnegative().optional(),
		idMessage: z.string().min(1).optional(),
		chatId: z.string().min(1).optional(),
		status: z.string().min(1).optional(),
		description: z.string().optional(),
		stateInstance: z.string().min(1).optional(),
		senderData: z
			.object({
				chatId: z.string().min(1),
				chatName: z.string().optional(),
				senderName: z.string().optional(),
			})
			.optional(),
		messageData: z
			.object({
				typeMessage: z.string().min(1),
				textMessageData: z.object({ textMessage: z.string() }).optional(),
				extendedTextMessageData: z.object({ text: z.string() }).optional(),
			})
			.optional(),
	})
	.superRefine((body, context) => {
		const invalid = () => context.addIssue({ code: 'custom', message: 'Incomplete notification' });
		if (body.typeWebhook === 'incomingMessageReceived') {
			if (!body.idMessage || !body.senderData || !body.messageData) {
				invalid();
				return;
			}
			if (body.messageData.typeMessage === 'textMessage' && !body.messageData.textMessageData) {
				invalid();
			}
			if (body.messageData.typeMessage === 'extendedTextMessage' && !body.messageData.extendedTextMessageData) {
				invalid();
			}
		}
		if (body.typeWebhook === 'outgoingMessageStatus' && !body.status) {
			invalid();
		}
		if (body.typeWebhook === 'stateInstanceChanged' && !body.stateInstance) {
			invalid();
		}
	});

export const notificationSchema = z.object({ receiptId: z.number().int().positive(), body: notificationBodySchema });
export const receiveNotificationSchema = notificationSchema.nullable();
export const deleteNotificationSchema = z.object({ result: z.boolean() });
