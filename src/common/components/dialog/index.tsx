'use client';
import { useRef } from 'react';
import type { ReactNode } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { Button } from '@/common/components/button';

import s from './s.module.css';

type TProps = {
	title: string;
	description: string;
	icon?: ReactNode;
	children: ReactNode;
	isBusy?: boolean;
	onClose: () => void;
};
export const Dialog = ({ title, description, icon, children, isBusy = false, onClose }: TProps) => {
	const previousFocus = useRef<HTMLElement | null>(null);
	const content = useRef<HTMLDivElement>(null);
	const handleClose = () => {
		if (!isBusy) {
			onClose();
		}
	};
	return (
		<DialogPrimitive.Root
			open
			onOpenChange={(open) => {
				if (!open) {
					handleClose();
				}
			}}
		>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className={s.overlay}>
					<DialogPrimitive.Content
						ref={content}
						className={s.content}
						aria-busy={isBusy || undefined}
						onOpenAutoFocus={(event) => {
							previousFocus.current =
								document.activeElement instanceof HTMLElement ? document.activeElement : null;
							const firstInput = content.current?.querySelector<HTMLInputElement>('input');
							if (firstInput) {
								event.preventDefault();
								firstInput.focus();
							}
						}}
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							if (previousFocus.current?.isConnected) {
								previousFocus.current.focus();
							}
						}}
						onEscapeKeyDown={(event) => {
							if (isBusy) {
								event.preventDefault();
							}
						}}
						onPointerDownOutside={(event) => {
							if (isBusy) {
								event.preventDefault();
							}
						}}
					>
						<Button
							variant="icon"
							className={s.close}
							aria-label="Закрыть"
							aria-disabled={isBusy}
							onClick={handleClose}
						>
							<X size={21} />
						</Button>
						{icon}
						<DialogPrimitive.Title className={s.title}>{title}</DialogPrimitive.Title>
						<DialogPrimitive.Description className={s.description}>
							{description}
						</DialogPrimitive.Description>
						{children}
					</DialogPrimitive.Content>
				</DialogPrimitive.Overlay>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
};
