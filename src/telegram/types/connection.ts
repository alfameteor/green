export type TConnectionStatus = 'connected' | 'reconnecting' | 'checking' | 'unauthorized' | 'unavailable' | 'stopped';
export type TConnection = {
	status: TConnectionStatus;
	label: string;
	message: string;
};
export type TQueueState = {
	status: 'ready' | 'retrying' | 'checking' | 'stopped';
	message: string;
};
