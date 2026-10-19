// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageComposer } from './index';

afterEach(cleanup);

describe('MessageComposer keyboard interactions', () => {
	it('sends the message on Enter without Shift and prevents default newline', () => {
		const onSend = vi.fn();
		render(
			<MessageComposer
				draft="Привет из теста"
				isSending={false}
				sendError=""
				onDraftChange={vi.fn()}
				onSend={onSend}
			/>,
		);

		const textarea = screen.getByRole('textbox', { name: 'Сообщение' });
		const event = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: false,
			cancelable: true,
			bubbles: true,
		});
		textarea.dispatchEvent(event);

		expect(onSend).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});

	it('does not send message on Shift + Enter and allows default newline', () => {
		const onSend = vi.fn();
		render(
			<MessageComposer
				draft="Привет из теста"
				isSending={false}
				sendError=""
				onDraftChange={vi.fn()}
				onSend={onSend}
			/>,
		);

		const textarea = screen.getByRole('textbox', { name: 'Сообщение' });
		const event = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: true,
			cancelable: true,
			bubbles: true,
		});
		textarea.dispatchEvent(event);

		expect(onSend).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it('does not send message on Enter when draft is empty or contains only whitespace', () => {
		const onSend = vi.fn();
		render(<MessageComposer draft="   " isSending={false} sendError="" onDraftChange={vi.fn()} onSend={onSend} />);

		const textarea = screen.getByRole('textbox', { name: 'Сообщение' });
		const event = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: false,
			cancelable: true,
			bubbles: true,
		});
		textarea.dispatchEvent(event);

		expect(onSend).not.toHaveBeenCalled();
	});

	it('does not send message on Enter when isSending is true', () => {
		const onSend = vi.fn();
		render(
			<MessageComposer draft="Привет" isSending={true} sendError="" onDraftChange={vi.fn()} onSend={onSend} />,
		);

		const textarea = screen.getByRole('textbox', { name: 'Сообщение' });
		const event = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: false,
			cancelable: true,
			bubbles: true,
		});
		textarea.dispatchEvent(event);

		expect(onSend).not.toHaveBeenCalled();
	});

	it('does not send message on Enter during IME composition', () => {
		const onSend = vi.fn();
		render(
			<MessageComposer draft="Привет" isSending={false} sendError="" onDraftChange={vi.fn()} onSend={onSend} />,
		);

		const textarea = screen.getByRole('textbox', { name: 'Сообщение' });
		const event = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: false,
			cancelable: true,
			bubbles: true,
			isComposing: true,
		});
		textarea.dispatchEvent(event);

		expect(onSend).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it('does not send message when disabled or send is blocked', () => {
		const onSend = vi.fn();
		const { rerender } = render(
			<MessageComposer
				draft="Привет"
				isSending={false}
				disabled={true}
				sendError=""
				onDraftChange={vi.fn()}
				onSend={onSend}
			/>,
		);

		const textarea = screen.getByRole('textbox', { name: 'Сообщение' });
		const event1 = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: false,
			cancelable: true,
			bubbles: true,
		});
		textarea.dispatchEvent(event1);
		expect(onSend).not.toHaveBeenCalled();

		rerender(
			<MessageComposer
				draft="Привет"
				isSending={false}
				disabled={false}
				isSendBlocked={true}
				sendError=""
				onDraftChange={vi.fn()}
				onSend={onSend}
			/>,
		);

		const event2 = new KeyboardEvent('keydown', {
			key: 'Enter',
			shiftKey: false,
			cancelable: true,
			bubbles: true,
		});
		textarea.dispatchEvent(event2);
		expect(onSend).not.toHaveBeenCalled();
	});

	it('submits via button click when canSend is true', () => {
		const onSend = vi.fn();
		render(
			<MessageComposer
				draft="Привет из кнопки"
				isSending={false}
				sendError=""
				onDraftChange={vi.fn()}
				onSend={onSend}
			/>,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Отправить сообщение' }));
		expect(onSend).toHaveBeenCalledTimes(1);
	});
});
