// Yandex Metrika helpers. Without NEXT_PUBLIC_YM_ID every call is a no-op,
// so local runs and tests send nothing.
export const METRIKA_ID = Number(process.env.NEXT_PUBLIC_YM_ID) || 0;

// Webvisor masking: hide element content and do not record keystrokes.
// Credentials, phone numbers and message texts must never reach recordings.
export const METRIKA_PRIVATE_CLASS = 'ym-hide-content ym-disable-keys';

export type TMetrikaGoal =
	| 'connect_success'
	| 'connect_error'
	| 'chat_created'
	| 'chat_create_error'
	| 'message_sent'
	| 'message_send_error'
	| 'message_received'
	| 'logout';

type TYm = (id: number, method: string, ...args: unknown[]) => void;

// Only the goal name is sent: no tokens, phones, chat ids or texts.
export const reachGoal = (goal: TMetrikaGoal) => {
	if (!METRIKA_ID || typeof window === 'undefined') {
		return;
	}
	const ym = (window as unknown as { ym?: TYm }).ym;
	ym?.(METRIKA_ID, 'reachGoal', goal);
};
