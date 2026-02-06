import type { ServerInfo } from '$lib/server/servers/schema';

export async function getAllServerInfo(): Promise<ServerInfo[]> {
	const response = await fetch('/api/servers');
	if (!response.ok) {
		throw new Error('Failed to fetch server information');
	}

	const data = await response.json();
	return data;
}

export async function getServerInfoById(id: string): Promise<ServerInfo> {
	const response = await fetch(`/api/servers/${id}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch server information for ID: ${id}`);
	}

	const data = await response.json();
	return data;
}

export async function startServer(id: string): Promise<void> {
	const response = await fetch(`/api/servers/${id}/start`, {
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error(`Failed to start server with ID: ${id}`);
	}
}

export async function stopServer(id: string): Promise<void> {
	const response = await fetch(`/api/servers/${id}/stop`, {
		method: 'POST'
	});
	if (!response.ok) {
		throw new Error(`Failed to stop server with ID: ${id}`);
	}
}
