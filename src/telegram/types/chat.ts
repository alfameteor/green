export type TMessage = {
	id: string;
	text: string;
	time: number;
	outgoing: boolean;
	status?: string;
};

export type TChat = {
	id: string;
	name: string;
	phone?: string;
	username?: string;
	messages: TMessage[];
};
