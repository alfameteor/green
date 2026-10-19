import { useId } from 'react';
import type { ComponentPropsWithRef } from 'react';

import cn from 'classnames';

import { METRIKA_PRIVATE_CLASS } from '@/common/analytics/metrika';

import s from './s.module.css';

type TProps = ComponentPropsWithRef<'input'> & { label: string; hint?: string; error?: string };
export const TextField = ({
	label,
	hint,
	error,
	id,
	className,
	'aria-describedby': describedBy,
	...inputProps
}: TProps) => {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const description =
		[describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;
	return (
		<div className={s.field}>
			<label htmlFor={inputId}>{label}</label>
			<input
				{...inputProps}
				className={cn(className, METRIKA_PRIVATE_CLASS)}
				id={inputId}
				aria-invalid={Boolean(error)}
				aria-describedby={description}
			/>
			{hint && (
				<small id={`${inputId}-hint`} className={s.hint}>
					{hint}
				</small>
			)}
			{error && (
				<p id={`${inputId}-error`} className={s.error} role="alert">
					{error}
				</p>
			)}
		</div>
	);
};
