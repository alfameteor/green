import { ChatList } from '@/telegram/components/chat-list';
import { Conversation } from '@/telegram/components/conversation';
import { MessageComposer } from '@/telegram/features/send-message';

import s from '../chat-workspace/s.module.css';

const ignoreAction = () => {};

export const DisconnectedChat = () => (
	<section className={s.workspace} aria-label="Telegram чат">
		<ChatList
			chats={[]}
			selected={null}
			instance=""
			pollError=""
			isConnected={false}
			onSelect={ignoreAction}
			onNewChat={ignoreAction}
			onLogout={ignoreAction}
		/>
		<Conversation
			pollError=""
			isConnected={false}
			onBack={ignoreAction}
			onNewChat={ignoreAction}
			composer={
				<MessageComposer
					draft=""
					isSending={false}
					disabled
					sendError=""
					onDraftChange={ignoreAction}
					onSend={ignoreAction}
				/>
			}
		/>
	</section>
);
