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
		const errorData = await response.json();

		throw new Error(errorData.message || `Failed to start server with ID: ${id}`);
	}
}

export async function restartServer(id: string): Promise<void> {
	const response = await fetch(`/api/servers/${id}/restart`, {
		method: 'POST'
	});
	if (!response.ok) {
		const errorData = await response.json();

		throw new Error(errorData.message || `Failed to restart server with ID: ${id}`);
	}
}

export async function stopServer(id: string): Promise<void> {
	const response = await fetch(`/api/servers/${id}/stop`, {
		method: 'POST'
	});
	if (!response.ok) {
		const errorData = await response.json();

		throw new Error(errorData.message || `Failed to stop server with ID: ${id}`);
	}
}

export async function sendRconCommand(id: string, command: string): Promise<void> {
	const response = await fetch(`/api/servers/${id}/rcon`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ command })
	});
	if (!response.ok) {
		throw new Error(`Failed to send RCON command to server with ID: ${id}`);
	}
}
