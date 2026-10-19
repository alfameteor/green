'use client';

import type { FormEvent, KeyboardEvent } from 'react';

import { Send } from 'lucide-react';

import { METRIKA_PRIVATE_CLASS } from '@/common/analytics/metrika';
import { ErrorNotice } from '@/common/components/error-notice';

import { MAX_MESSAGE_LENGTH } from '../../const';
import s from './s.module.css';

type TProps = {
	draft: string;
	isSending: boolean;
	disabled?: boolean;
	isSendBlocked?: boolean;
	sendError: string;
	onDraftChange: (text: string) => void;
	onSend: () => void;
};

export const MessageComposer = ({
	draft,
	isSending,
	disabled = false,
	isSendBlocked = false,
	sendError,
	onDraftChange,
	onSend,
}: TProps) => {
	const canSend = !disabled && !isSendBlocked && !isSending && Boolean(draft.trim());

	const handleSubmit = (event?: FormEvent) => {
		event?.preventDefault();
		if (canSend) {
			onSend();
		}
	};
	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
			event.preventDefault();
			if (canSend) {
				handleSubmit();
			}
		}
	};
	return (
		<div className={s.composerWrap}>
			<ErrorNotice>{sendError}</ErrorNotice>
			<form className={s.composer} onSubmit={handleSubmit}>
				<textarea
					className={METRIKA_PRIVATE_CLASS}
					aria-label="Сообщение"
					placeholder="Напишите сообщение…"
					rows={1}
					maxLength={MAX_MESSAGE_LENGTH}
					value={draft}
					disabled={disabled || isSending}
					onChange={(e) => onDraftChange(e.target.value)}
					onKeyDown={handleKeyDown}
				/>
				<button className={s.sendButton} aria-label="Отправить сообщение" disabled={!canSend}>
					<Send size={21} />
				</button>
			</form>
		</div>
	);
};
