export const sleep = (ms: number, signal: AbortSignal) => {
	return new Promise<void>((resolve) => {
		if (signal.aborted) {
			return resolve();
		}
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener('abort', done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener('abort', done, { once: true });
	});
};
