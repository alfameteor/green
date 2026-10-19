import { useForm } from 'react-hook-form';

import { useMutation } from '@tanstack/react-query';

import type { TGreenApi } from '@/api';
import { reachGoal } from '@/common/analytics/metrika';
import { useAbortableTask } from '@/common/hooks/abortable-task';
import { getErrorMessage } from '@/common/utils/errors';
import type { TChat } from '@/telegram/types/chat';

import { createChat } from '../services/create-chat';

type TOptions = {
	api: TGreenApi;
	onCreated: (chat: TChat) => void;
	onClose: () => void;
	isAvailable?: boolean;
	onApiError?: (error: unknown) => void;
};
type TCreateChatForm = { contact: string };
export const useCreateChat = ({ api, onCreated, onClose, isAvailable = true, onApiError }: TOptions) => {
	const form = useForm<TCreateChatForm>({ defaultValues: { contact: '' }, mode: 'onBlur' });
	const runTask = useAbortableTask();
	const mutation = useMutation({
		onError: (error) => {
			reachGoal('chat_create_error');
			onApiError?.(error);
		},
		mutationFn: (value: string) => runTask((signal) => createChat(api, value, signal), 'create-chat'),
		onSuccess: (chat) => {
			reachGoal('chat_created');
			onCreated(chat);
			onClose();
		},
	});
	const handleSubmit = form.handleSubmit(async ({ contact }) => {
		if (!isAvailable || mutation.isPending) {
			return;
		}
		try {
			await mutation.mutateAsync(contact);
		} catch {
			/* Displayed below the form. */
		}
	});
	return {
		form,
		handleSubmit,
		resetError: mutation.reset,
		isCreating: mutation.isPending || form.formState.isSubmitting,
		errorMessage: mutation.error ? getErrorMessage(mutation.error) : '',
	};
};
