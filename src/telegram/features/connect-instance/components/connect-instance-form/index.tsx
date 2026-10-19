'use client';
import { useEffect } from 'react';

import { ArrowRight, KeyRound } from 'lucide-react';

import type { TCredentials, TGreenApi } from '@/api';
import { Button } from '@/common/components/button';
import { ErrorNotice } from '@/common/components/error-notice';
import { TextField } from '@/common/components/text-field';
import ui from '@/common/styles/controls.module.css';
import { validateInput } from '@/common/utils/validation';

import { useConnectInstance } from '../../hooks/connect-instance';
import { normalizeApiUrl, normalizeInstanceId, normalizeApiToken } from '../../utils/validate-credentials';
import s from './s.module.css';

type TProps = { onConnect: (credentials: TCredentials, api: TGreenApi) => void; isConnected?: boolean };
export const ConnectInstanceForm = ({ onConnect, isConnected = false }: TProps) => {
	const { form, handleSubmit, isConnecting, errorMessage, resetMutation } = useConnectInstance(onConnect);
	const {
		register,
		reset,
		formState: { errors },
	} = form;
	const isReadOnly = isConnecting || isConnected;
	useEffect(() => {
		if (!isConnected) {
			reset();
			resetMutation();
		}
	}, [isConnected, reset, resetMutation]);
	return (
		<section className={s.connectCard}>
			<div className={ui.cardIcon}>
				<KeyRound size={23} />
			</div>
			<h2>Подключить Telegram</h2>
			<p className={ui.muted}>Введите данные вашего инстанса GREEN-API</p>
			<form noValidate onSubmit={handleSubmit} onChange={resetMutation} aria-busy={isConnecting}>
				<TextField
					label="API URL"
					type="url"
					placeholder="https://4100.api.green-api.com"
					autoComplete="url"
					required
					readOnly={isReadOnly}
					hint="Поле apiUrl в личном кабинете"
					error={errors.apiUrl?.message}
					{...register('apiUrl', {
						required: 'Укажите API URL.',
						validate: (value) => validateInput(() => normalizeApiUrl(value)),
					})}
				/>
				<TextField
					label="ID инстанса"
					inputMode="numeric"
					placeholder="Например, 4100000000"
					autoComplete="off"
					required
					readOnly={isReadOnly}
					error={errors.idInstance?.message}
					{...register('idInstance', {
						required: 'Укажите ID инстанса.',
						validate: (value) => validateInput(() => normalizeInstanceId(value)),
					})}
				/>
				<TextField
					label="API токен"
					type="password"
					placeholder="Ваш apiTokenInstance"
					autoComplete="off"
					required
					readOnly={isReadOnly}
					error={errors.apiTokenInstance?.message}
					{...register('apiTokenInstance', {
						required: 'Укажите API токен.',
						validate: (value) => validateInput(() => normalizeApiToken(value)),
					})}
				/>
				<ErrorNotice>{errorMessage}</ErrorNotice>
				<Button type="submit" className={ui.connectButton} disabled={isConnected} isLoading={isConnecting}>
					{isConnected ? 'Инстанс выбран' : isConnecting ? 'Проверяем подключение…' : 'Начать общение'}
					{!isReadOnly && <ArrowRight size={18} />}
				</Button>
			</form>
			<div className={s.setupNote}>
				<p>
					Ещё нет инстанса? Создайте его в{' '}
					<a href="https://console.green-api.com/" target="_blank" rel="noreferrer">
						GREEN-API
					</a>{' '}
					и подключите Telegram по QR-коду.
				</p>
			</div>
		</section>
	);
};
