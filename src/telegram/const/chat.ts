export const MESSAGE_STATUS_LABELS: Record<string, string> = {
	queued: 'В очереди',
	sent: 'Отправлено',
	delivered: 'Доставлено',
	read: 'Прочитано',
	failed: 'Не доставлено',
};

export const POLL_INTERVAL_MS = 1050;
export const RETRY_DELAY_MS = 2000;
export const MAX_RETRY_DELAY_MS = 30000;
export const STATUS_CACHE_LIMIT = 1000;
