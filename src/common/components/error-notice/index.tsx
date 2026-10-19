import { CircleAlert } from 'lucide-react';

import s from './s.module.css';

export const ErrorNotice = ({ children }: { children: string }) => {
	return children ? (
		<div className={s.error} role="alert">
			<CircleAlert size={18} />
			<span>{children}</span>
		</div>
	) : null;
};
