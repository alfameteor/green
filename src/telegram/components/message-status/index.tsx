import { Check, CheckCheck, CircleAlert } from 'lucide-react';

export const MessageStatus = ({ status }: { status?: string }) => {
	switch (status) {
		case 'read':
		case 'delivered':
			return <CheckCheck size={15} />;
		case 'failed':
			return (
				<>
					<CircleAlert size={15} />
					Не доставлено
				</>
			);
		case 'queued':
			return <>В очереди</>;
		default:
			return <Check size={15} />;
	}
};
