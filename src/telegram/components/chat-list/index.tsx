'use client';

import { useMemo, useState } from 'react';

import cn from 'classnames';
import { LogOut, Search, Send, SquarePen } from 'lucide-react';

import { formatTime } from '@/common/utils/date';
import type { TChat } from '@/telegram/types/chat';
import { getChatTitle } from '@/telegram/utils/chat';

import s from './s.module.css';

type TProps = {
	chats: TChat[];
	selected: string | null;
	instance: string;
	pollError: string;
	isConnected?: boolean;
	canCreateChat?: boolean;
	connectionLabel?: string;
	onSelect: (id: string) => void;
	onNewChat: () => void;
	onLogout: () => void;
};

export const ChatList = ({
	chats,
	selected,
	instance,
	pollError,
	isConnected = true,
	canCreateChat = isConnected,
	connectionLabel,
	onSelect,
	onNewChat,
	onLogout,
}: TProps) => {
	const [search, setSearch] = useState('');
	const visibleChats = useMemo(
		() =>
			chats.filter((chat) => {
				const title = getChatTitle(chat);
				const query = `${title} ${chat.name} ${chat.phone ?? ''} ${chat.username ?? ''}`.toLowerCase();
				return query.includes(search.toLowerCase());
			}),
		[chats, search],
	);

	return (
		<aside className={s.sidebar} aria-label="Список чатов">
			<header className={s.header}>
				<span className={s.logo} aria-hidden="true">
					<Send size={19} fill="currentColor" />
				</span>
				<h1>Telegram</h1>
				{isConnected && (
					<button className={s.logout} title="Выйти" aria-label="Выйти" onClick={onLogout}>
						<LogOut size={20} />
					</button>
				)}
			</header>
			<label className={s.search}>
				<Search size={19} />
				<input
					aria-label="Поиск чата"
					placeholder="Поиск"
					value={search}
					disabled={!isConnected}
					onChange={(event) => setSearch(event.target.value)}
				/>
			</label>
			<div className={s.tabs}>
				<span>Все чаты</span>
			</div>
			<div className={s.chatList}>
				{visibleChats.map((chat) => {
					const lastMessage = chat.messages.at(-1);
					const chatTitle = getChatTitle(chat);
					return (
						<button
							key={chat.id}
							className={cn(s.chatItem, { [s.active]: selected === chat.id })}
							aria-pressed={selected === chat.id}
							title={chatTitle}
							onClick={() => onSelect(chat.id)}
						>
							<span className={s.avatar}>{chatTitle.replace('@', '').slice(0, 2).toUpperCase()}</span>
							<span className={s.chatItemCopy}>
								<span className={s.chatItemTop}>
									<strong>{chatTitle}</strong>
									{lastMessage && <time>{formatTime(lastMessage.time)}</time>}
								</span>
								<span className={s.preview}>
									{lastMessage
										? `${lastMessage.outgoing ? 'Вы: ' : ''}${lastMessage.text}`
										: 'Нет сообщений'}
								</span>
							</span>
						</button>
					);
				})}

				{!visibleChats.length && <p className={s.empty}>{search ? 'Ничего не найдено' : 'Нет чатов'}</p>}
			</div>
			<button
				className={s.newChat}
				aria-label="Новый чат"
				title="Новый чат"
				disabled={!canCreateChat}
				onClick={onNewChat}
			>
				<SquarePen size={23} />
			</button>
			<div className={s.account} title={isConnected ? `Инстанс ${instance}` : 'Подключите Telegram'}>
				<span className={cn(s.connectionDot, { [s.offline]: !isConnected || pollError })} />
				<span>{connectionLabel ?? (!isConnected ? 'Не подключено' : 'Telegram подключён')}</span>
			</div>
		</aside>
	);
};
