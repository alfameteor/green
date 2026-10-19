export const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : 'Что-то пошло не так. Попробуйте ещё раз.';
