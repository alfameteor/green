export type TApiErrorCode = 'http' | 'protocol' | 'rate-limit' | 'instance-unavailable' | 'rejected';

export class ApiError extends Error {
	readonly status: number;
	readonly code: TApiErrorCode;
	constructor(message: string, status: number, code: TApiErrorCode = 'http') {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}
