'use client';

import { reachGoal } from '@/common/analytics/metrika';
import { ChatWorkspace } from '@/telegram/components/chat-workspace';
import { DisconnectedChat } from '@/telegram/components/disconnected-chat';
import { ConnectInstanceForm } from '@/telegram/features/connect-instance';
import { useSession } from '@/telegram/hooks/session';

import s from './chat-screen.module.css';

export const ChatScreen = () => {
	const { session, connect, disconnect } = useSession();
	const handleLogout = () => {
		reachGoal('logout');
		disconnect();
	};

	return (
		<main className={s.layout}>
			{session ? (
				<ChatWorkspace api={session.api} instance={session.credentials.idInstance} onLogout={handleLogout} />
			) : (
				<DisconnectedChat />
			)}
			<aside className={s.connectionPanel} aria-label="Подключение GREEN-API">
				<ConnectInstanceForm onConnect={connect} isConnected={Boolean(session)} />
			</aside>
		</main>
	);
};
