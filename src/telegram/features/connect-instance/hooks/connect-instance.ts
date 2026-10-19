import { useForm } from 'react-hook-form';

import { useMutation } from '@tanstack/react-query';

import type { TCredentials, TGreenApi } from '@/api';
import { reachGoal } from '@/common/analytics/metrika';
import { useAbortableTask } from '@/common/hooks/abortable-task';
import { getErrorMessage } from '@/common/utils/errors';

import { connectInstance } from '../services/connect-instance';

type TOnConnect = (credentials: TCredentials, api: TGreenApi) => void;
export const useConnectInstance = (onConnect: TOnConnect) => {
	const form = useForm<TCredentials>({
		defaultValues: { apiUrl: '', idInstance: '', apiTokenInstance: '' },
		mode: 'onBlur',
	});
	const runTask = useAbortableTask();
	const mutation = useMutation({
		mutationFn: (credentials: TCredentials) =>
			runTask((signal) => connectInstance(credentials, signal), 'connect-instance'),
		onSuccess: (session) => {
			reachGoal('connect_success');
			onConnect(session.credentials, session.api);
		},
		onError: () => reachGoal('connect_error'),
	});
	const handleSubmit = form.handleSubmit(async (credentials) => {
		if (mutation.isPending) {
			return;
		}
		// Errors remain in mutation state; catching prevents an unhandled submit promise.
		try {
			await mutation.mutateAsync(credentials);
		} catch {
			/* Displayed below the form. */
		}
	});
	return {
		form,
		handleSubmit,
		resetMutation: mutation.reset,
		isConnecting: mutation.isPending || form.formState.isSubmitting,
		errorMessage: mutation.error ? getErrorMessage(mutation.error) : '',
	};
};
