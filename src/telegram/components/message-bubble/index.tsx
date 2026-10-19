import cn from 'classnames';

import { formatTime } from '@/common/utils/date';

import { MESSAGE_STATUS_LABELS } from '../../const/chat';
import type { TMessage } from '../../types/chat';
import { MessageStatus } from '../message-status';
import s from './s.module.css';

type TProps = {
	message: TMessage;
};

export const MessageBubble = ({ message }: TProps) => (
	<div className={cn(s.message, message.outgoing ? s.outgoing : s.incoming)}>
		<p>{message.text}</p>
		<div className={s.messageMeta}>
			<time>{formatTime(message.time)}</time>
			{message.outgoing && (
				<span title={MESSAGE_STATUS_LABELS[message.status ?? 'queued'] ?? message.status}>
					<MessageStatus status={message.status} />
				</span>
			)}
		</div>
	</div>
);
