export const formatTime = (timestamp: number) =>
	new Date(timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
