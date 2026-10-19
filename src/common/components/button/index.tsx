import type { ComponentPropsWithRef } from 'react';

import cn from 'classnames';

import ui from '@/common/styles/controls.module.css';

type TProps = ComponentPropsWithRef<'button'> & { variant?: 'primary' | 'icon'; isLoading?: boolean };
export const Button = ({
	variant = 'primary',
	isLoading = false,
	disabled,
	type = 'button',
	className,
	...props
}: TProps) => (
	<button
		{...props}
		type={type}
		className={cn(variant === 'primary' ? ui.primary : ui.iconButton, className)}
		disabled={disabled || isLoading}
		aria-busy={isLoading || undefined}
	/>
);
