// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAbortableTask } from './abortable-task';

describe('useAbortableTask', () => {
	it('blocks concurrent execution under the same key', async () => {
		const { result } = renderHook(() => useAbortableTask());
		let finishTask1!: () => void;
		const task1Promise = new Promise<string>((resolve) => {
			finishTask1 = () => resolve('task1');
		});

		let task1RunPromise!: Promise<string>;
		act(() => {
			task1RunPromise = result.current(() => task1Promise, 'key-a');
		});

		await expect(result.current(async () => 'task2', 'key-a')).rejects.toThrow(
			'Дождитесь завершения текущего запроса.',
		);

		act(() => {
			finishTask1();
		});
		await expect(task1RunPromise).resolves.toBe('task1');
	});

	it('allows concurrent execution under different keys', async () => {
		const { result } = renderHook(() => useAbortableTask());
		let finishTaskA!: () => void;
		let finishTaskB!: () => void;

		const taskAPromise = new Promise<string>((resolve) => {
			finishTaskA = () => resolve('result-a');
		});
		const taskBPromise = new Promise<string>((resolve) => {
			finishTaskB = () => resolve('result-b');
		});

		let taskARunPromise!: Promise<string>;
		let taskBRunPromise!: Promise<string>;

		act(() => {
			taskARunPromise = result.current(() => taskAPromise, 'key-a');
			taskBRunPromise = result.current(() => taskBPromise, 'key-b');
		});

		act(() => {
			finishTaskA();
			finishTaskB();
		});

		await expect(taskARunPromise).resolves.toBe('result-a');
		await expect(taskBRunPromise).resolves.toBe('result-b');
	});

	it('aborts all running tasks when unmounted', async () => {
		const { result, unmount } = renderHook(() => useAbortableTask());
		let signalA!: AbortSignal;
		let signalB!: AbortSignal;

		const taskA = vi.fn((signal: AbortSignal) => {
			signalA = signal;
			return new Promise<string>(() => {});
		});
		const taskB = vi.fn((signal: AbortSignal) => {
			signalB = signal;
			return new Promise<string>(() => {});
		});

		act(() => {
			void result.current(taskA, 'key-a');
			void result.current(taskB, 'key-b');
		});

		expect(signalA.aborted).toBe(false);
		expect(signalB.aborted).toBe(false);

		unmount();

		expect(signalA.aborted).toBe(true);
		expect(signalB.aborted).toBe(true);
	});
});
