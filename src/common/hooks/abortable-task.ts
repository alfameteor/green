'use client';

import { useEffect, useRef } from 'react';

// Mutations are not automatically aborted by TanStack Query when a view unmounts.
// Supports keyed execution so independent tasks (e.g. sending messages to different chats)
// do not block each other.
export const useAbortableTask = () => {
	const activeRequests = useRef(new Map<string, AbortController>());

	useEffect(() => {
		const requests = activeRequests.current;
		return () => {
			requests.forEach((controller) => controller.abort());
			requests.clear();
		};
	}, []);

	const runTask = async <TResult>(
		task: (signal: AbortSignal) => Promise<TResult>,
		key: string = 'default',
	): Promise<TResult> => {
		if (activeRequests.current.has(key)) {
			throw new Error('Дождитесь завершения текущего запроса.');
		}
		const controller = new AbortController();
		activeRequests.current.set(key, controller);
		try {
			const result = await task(controller.signal);
			controller.signal.throwIfAborted();
			return result;
		} finally {
			activeRequests.current.delete(key);
		}
	};
	return runTask;
};
