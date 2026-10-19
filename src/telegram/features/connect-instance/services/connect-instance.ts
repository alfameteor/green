import { createGreenApi } from '@/api';
import type { TCredentials } from '@/api';
import { validateCredentials } from '@/telegram/features/connect-instance/utils/validate-credentials';

export const connectInstance = async (input: TCredentials, signal: AbortSignal) => {
	const credentials = validateCredentials(input);
	const api = createGreenApi(credentials);
	const state = await api.instance.getState(signal);
	if (state.stateInstance !== 'authorized') {
		throw new Error('Подключите Telegram в личном кабинете GREEN-API. Инстанс должен иметь статус authorized.');
	}
	const settings = await api.instance.getSettings(signal);
	if (settings.typeInstance !== 'telegram') {
		throw new Error('Для этого приложения нужен Telegram-инстанс GREEN-API.');
	}
	if (
		settings.webhookUrl ||
		settings.incomingWebhook !== 'yes' ||
		settings.outgoingWebhook !== 'yes' ||
		settings.stateWebhook !== 'yes'
	) {
		throw new Error(
			'В настройках GREEN-API очистите Webhook URL и включите входящие сообщения, статусы отправки и статусы инстанса (incomingWebhook, outgoingWebhook, stateWebhook). После сохранения подождите минуту.',
		);
	}
	return { credentials, api };
};
