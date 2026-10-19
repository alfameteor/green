import { MessageCircle } from 'lucide-react';

import s from './s.module.css';

export const Brand = () => {
	return (
		<div data-brand className={s.brand}>
			<span className={s.brandMark}>
				<MessageCircle size={24} strokeWidth={2.3} />
			</span>
			<span>
				mini<span className={s.brandLight}>chat</span>
				<small>TELEGRAM EDITION</small>
			</span>
		</div>
	);
};
