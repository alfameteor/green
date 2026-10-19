import type { z } from 'zod';

import type { notificationSchema, deleteNotificationSchema } from './schemas';

export type TNotification = z.infer<typeof notificationSchema>;
export type TDeleteNotificationResponse = z.infer<typeof deleteNotificationSchema>;
