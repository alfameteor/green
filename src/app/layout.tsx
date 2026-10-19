import type { ReactNode } from 'react';

import type { Metadata, Viewport } from 'next';

import { Providers } from '@/api/query-provider';
import { YandexMetrika } from '@/common/analytics';

import './globals.css';

export const metadata: Metadata = {
	title: 'Mini Chat · Telegram',
	description: 'Мини-приложение для переписки в Telegram через GREEN-API',
};
export const viewport: Viewport = { themeColor: '#f5f7fa' };

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<Providers>{children}</Providers>
				<YandexMetrika />
			</body>
		</html>
	);
}
