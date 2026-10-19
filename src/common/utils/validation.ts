export const validateInput = (validate: () => unknown): true | string => {
	try {
		validate();
		return true;
	} catch (error) {
		return error instanceof Error ? error.message : 'Проверьте значение поля.';
	}
};
