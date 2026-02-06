import { writable } from 'svelte/store';

export type ToastType = 'default' | 'success' | 'warning' | 'error';

export type Toast = {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
};

const toasts = writable<Toast[]>([]);

function push(message: string, type: ToastType = 'default', duration = 3000) {
	const id = crypto.randomUUID();
	const toast: Toast = { id, message, type, duration };

	toasts.update((all) => [...all, toast]);

	setTimeout(() => {
		toasts.update((all) => all.filter((t) => t.id !== id));
	}, duration);
}

export const toast = {
	default: (msg: string, duration?: number) => push(msg, 'default', duration),
	success: (msg: string, duration?: number) => push(msg, 'success', duration),
	warning: (msg: string, duration?: number) => push(msg, 'warning', duration),
	error: (msg: string, duration?: number) => push(msg, 'error', duration)
};

export { toasts };
