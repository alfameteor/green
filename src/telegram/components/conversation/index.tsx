'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import cn from 'classnames';
import { ArrowLeft, Plus, Send } from 'lucide-react';

import { ErrorNotice } from '@/common/components/error-notice';
import { MessageBubble } from '@/telegram/components/message-bubble';
import type { TChat } from '@/telegram/types/chat';
import { getChatTitle } from '@/telegram/utils/chat';

import s from './s.module.css';

type TProps = {
	chat?: TChat;
	pollError: string;
	composer: ReactNode;
	isConnected?: boolean;
	canCreateChat?: boolean;
	connectionLabel?: string;
	onReconnect?: () => void;
	isChecking?: boolean;
	onBack: () => void;
	onNewChat: () => void;
};

export const Conversation = ({
	chat,
	pollError,
	composer,
	isConnected = true,
	canCreateChat = isConnected,
	connectionLabel,
	onReconnect,
	isChecking = false,
	onBack,
	onNewChat,
}: TProps) => {
	const messagesEnd = useRef<HTMLDivElement>(null);
	const chatTitle = chat ? getChatTitle(chat) : 'Telegram';
	const subtitle = pollError
		? connectionLabel
		: isConnected
			? chat?.phone && chat.phone !== chatTitle
				? chat.phone
				: 'Подключено'
			: 'Не подключено';

	useEffect(() => {
		messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chat?.id, chat?.messages.length]);

	return (
		<section className={s.conversation}>
			<header className={s.conversationHeader}>
				{chat && (
					<button className={s.back} aria-label="Назад к чатам" onClick={onBack}>
						<ArrowLeft size={24} />
					</button>
				)}
				<span className={s.avatar} aria-hidden="true">
					{chat ? chatTitle.replace('@', '').slice(0, 2).toUpperCase() : <Send size={23} />}
				</span>
				<div className={s.contact}>
					<h2>{chatTitle}</h2>
					<p>{subtitle}</p>
				</div>
			</header>

			{pollError && (
				<div className={s.pollError}>
					<ErrorNotice>{pollError}</ErrorNotice>
					{onReconnect && (
						<button className={s.reconnect} disabled={isChecking} onClick={onReconnect}>
							{isChecking ? 'Проверяем подключение…' : 'Проверить подключение'}
						</button>
					)}
				</div>
			)}
			<div
				className={cn(s.messages, !chat?.messages.length && s.emptyMessages)}
				role="log"
				aria-label="Сообщения"
				aria-live="polite"
			>
				{!chat && (
					<div className={s.emptyConversation}>
						<p className={s.serviceMessage}>
							{isConnected
								? 'Выберите чат или создайте новый'
								: 'Подключите Telegram, чтобы начать переписку'}
						</p>
						{isConnected && (
							<button className={s.newChat} disabled={!canCreateChat} onClick={onNewChat}>
								<Plus size={18} />
								Новый чат
							</button>
						)}
					</div>
				)}
				{chat && !chat.messages.length && <p className={s.serviceMessage}>Сообщений пока нет</p>}
				{chat?.messages.map((message, index) => (
					<div key={message.id}>
						{(index === 0 ||
							new Date(message.time).toDateString() !==
								new Date(chat.messages[index - 1].time).toDateString()) && (
							<div className={s.dayLabel}>
								{new Date(message.time).toLocaleDateString('ru', {
									day: 'numeric',
									month: 'long',
								})}
							</div>
						)}
						<MessageBubble message={message} />
					</div>
				))}
				<div ref={messagesEnd} />
			</div>
			{composer}
		</section>
	);
};
