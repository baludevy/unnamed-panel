export function generateServerId() {
	return 'srv_' + Math.random().toString(36).slice(2, 10);
}
