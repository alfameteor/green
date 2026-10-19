import type { z } from 'zod';

import type { instanceSettingsSchema, instanceStateSchema } from './schemas';

export type TInstanceState = z.infer<typeof instanceStateSchema>;
export type TInstanceSettings = z.infer<typeof instanceSettingsSchema>;
