'use client';
import { ArrowRight, MessageCircle } from 'lucide-react';

import type { TGreenApi } from '@/api';
import { Button } from '@/common/components/button';
import { Dialog } from '@/common/components/dialog';
import { ErrorNotice } from '@/common/components/error-notice';
import { TextField } from '@/common/components/text-field';
import ui from '@/common/styles/controls.module.css';
import { validateInput } from '@/common/utils/validation';
import type { TChat } from '@/telegram/types/chat';

import { useCreateChat } from '../../hooks/create-chat';
import { parseContact } from '../../utils/validate-contact';

type TProps = {
	api: TGreenApi;
	onCreated: (chat: TChat) => void;
	onClose: () => void;
	isAvailable?: boolean;
	onApiError?: (error: unknown) => void;
	connectionMessage?: string;
};
export const CreateChatDialog = ({
	api,
	onCreated,
	onClose,
	isAvailable = true,
	onApiError,
	connectionMessage,
}: TProps) => {
	const { form, handleSubmit, isCreating, errorMessage, resetError } = useCreateChat({
		api,
		onCreated,
		onClose,
		isAvailable,
		onApiError,
	});
	return (
		<Dialog
			title="Новый разговор"
			description="Введите номер или @username собеседника в Telegram"
			onClose={onClose}
			isBusy={isCreating}
			icon={
				<div className={ui.cardIcon}>
					<MessageCircle size={25} />
				</div>
			}
		>
			<form noValidate onSubmit={handleSubmit} onChange={resetError}>
				<TextField
					label="Номер телефона или @username"
					type="text"
					placeholder="+375 29 123 45 67 или @username"
					required
					readOnly={isCreating}
					hint="В международном формате с кодом страны или @username"
					error={form.formState.errors.contact?.message}
					{...form.register('contact', {
						required: 'Укажите номер телефона или @username.',
						validate: (value) => validateInput(() => parseContact(value)),
					})}
				/>
				<ErrorNotice>{connectionMessage || errorMessage}</ErrorNotice>
				<Button type="submit" className={ui.connectButton} isLoading={isCreating} disabled={!isAvailable}>
					{isCreating ? 'Ищем аккаунт…' : 'Создать чат'}
					<ArrowRight size={18} />
				</Button>
			</form>
		</Dialog>
	);
};
