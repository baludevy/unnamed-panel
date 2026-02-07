import path from 'node:path';
import fs from 'node:fs/promises';
import docker from '$lib/server/docker/client';
import type { ContainerInfo } from 'dockerode';
import { ServerRepository } from './repository';
import { DockerService } from './docker.service';
import {
	generateServerId,
	ensurePortFree,
	ensureDataDirFree,
	ensureImageExists,
	MC_IMAGE,
	generateRconPassword
} from './helper';
import type { ServerCreationPayload, MinecraftServerInfo } from './schema';
import { RconService } from '../rcon/service';

let containerCache: ContainerInfo[] = [];
let refreshPromise: Promise<void> | null = null;

async function refreshContainerCache() {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		try {
			containerCache = await docker.listContainers({ all: true });
		} catch (error) {
			console.error('Docker Cache Sync Failed:', error);
		} finally {
			clearTimeout(timeout);
			refreshPromise = null;
		}
	})();

	return refreshPromise;
}

function findContainer(id: string, containerId: string | null) {
	if (containerId) {
		const direct = containerCache.find((c) => c.Id === containerId);
		if (direct) return direct;
	}
	return containerCache.find((c) => c.Labels?.['mc.server_id'] === id) || null;
}

function deriveState(container: ContainerInfo | null): string {
	return container?.State || 'missing';
}

export async function listMinecraftServers() {
	await refreshContainerCache();
	const servers = await ServerRepository.getAll();

	return servers.map((server) => {
		const container = findContainer(server.id, server.containerId);
		return {
			...server,
			state: deriveState(container)
		};
	});
}

export async function getMinecraftServerById(id: string): Promise<MinecraftServerInfo | null> {
	await refreshContainerCache();
	const server = await ServerRepository.getById(id);
	if (!server) return null;

	const container = findContainer(server.id, server.containerId);
	return {
		...server,
		state: deriveState(container)
	};
}

export async function createMinecraftServer(payload: ServerCreationPayload) {
	const directory = path.resolve(payload.directory);

	const portCheck = await ensurePortFree(payload.port);
	if (portCheck?.status === 'PORT_IN_USE') return portCheck;

	for (const extra of payload.additionalPorts) {
		const res = await ensurePortFree(extra.host);
		if (res?.status === 'PORT_IN_USE') return res;
	}

	const dirCheck = await ensureDataDirFree(directory);
	if (dirCheck?.status === 'DATA_DIR_IN_USE') return dirCheck;

	try {
		await ensureImageExists(MC_IMAGE);
	} catch (error) {
		return { status: 'IMAGE_PULL_FAILED' };
	}

	const serverId = generateServerId();
	const rconPassword = generateRconPassword();

	try {
		const container = await DockerService.createServerContainer({
			...payload,
			serverId,
			directory,
			eula: true,
			rconPassword
		});

		const record = await ServerRepository.create(
			serverId,
			container.id,
			payload,
			directory,
			rconPassword
		);

		await refreshContainerCache();
		return record;
	} catch (error) {
		console.error('Server Creation Failed:', error);
		return { status: 'CREATION_FAILED' };
	}
}

export type StartStatus = 'NOT_FOUND' | 'ALREADY_RUNNING' | 'STARTED' | 'ERROR';

export async function startMinecraftServer(serverId: string): Promise<{ status: StartStatus }> {
	try {
		const server = await ServerRepository.getById(serverId);
		if (!server) return { status: 'NOT_FOUND' };

		let container: ContainerInfo | null = await DockerService.findContainerByLabel(serverId);

		if (container) {
			const recreate = await DockerService.needsRecreation(container.Id, {
				port: server.port,
				containerPort: server.containerPort,
				additionalPorts: server.additionalPorts,
				version: server.version,
				type: server.type,
				directory: server.directory,
				cpuLimit: server.cpuLimit,
				memoryLimit: server.memoryLimit,
				rconPort: server.rconPort,
				rconPassword: server.rconPassword
			});

			if (recreate) {
				await DockerService.stopAndRemove(container.Id);
				container = null;
			}
		}

		if (!container) {
			const created = await DockerService.createServerContainer({
				...server,
				serverId,
				directory: server.directory,
				eula: true
			});

			await ServerRepository.updateContainerId(serverId, created.id);
			await DockerService.startContainer(created.id);
		} else {
			if (await DockerService.isRunning(container.Id)) {
				return { status: 'ALREADY_RUNNING' };
			}
			await DockerService.startContainer(container.Id);
		}

		await refreshContainerCache();
		return { status: 'STARTED' };
	} catch (error) {
		console.error('Start sequence failed:', error);
		return { status: 'ERROR' };
	}
}

export async function stopMinecraftServer(serverId: string) {
	RconService.closeConnection(serverId);

	const server = await ServerRepository.getById(serverId);
	if (!server) return { status: 'NOT_FOUND' };

	const id = server.containerId || (await DockerService.findContainerByLabel(serverId))?.Id;
	if (!id) return { status: 'NOT_FOUND' };

	try {
		if (!(await DockerService.isRunning(id))) {
			return { status: 'ALREADY_STOPPED' };
		}
		await DockerService.stopContainer(id);
		return { status: 'STOPPED' };
	} catch {
		return { status: 'ERROR' };
	}
}

export async function restartMinecraftServer(serverId: string) {
	const stopped = await stopMinecraftServer(serverId);
	if (stopped.status === 'NOT_FOUND') return stopped;
	return startMinecraftServer(serverId);
}

export async function editMinecraftServer(
	serverId: string,
	payload: Partial<ServerCreationPayload>
) {
	const server = await ServerRepository.getById(serverId);
	if (!server) return { status: 'NOT_FOUND' };

	if (payload.port && payload.port !== server.port) {
		const res = await ensurePortFree(payload.port);
		if (res?.status === 'PORT_IN_USE') return res;
	}

	if (payload.additionalPorts) {
		for (const extra of payload.additionalPorts) {
			const exists = server.additionalPorts.some((p: any) => p.host === extra.host);
			if (!exists) {
				const res = await ensurePortFree(extra.host);
				if (res?.status === 'PORT_IN_USE') return res;
			}
		}
	}

	await ServerRepository.update(serverId, {
		...server,
		...payload,
		directory: payload.directory ? path.resolve(payload.directory) : server.directory
	});

	return { status: 'UPDATED' };
}

export async function removeMinecraftServer(serverId: string, deleteData = true) {
	RconService.closeConnection(serverId);

	const server = await ServerRepository.getById(serverId);
	if (!server) return { status: 'NOT_FOUND' };

	try {
		const container = await DockerService.findContainerByLabel(serverId);
		const id = server.containerId || container?.Id;

		if (id) await DockerService.stopAndRemove(id);
		if (deleteData && server.directory && server.directory !== '/') {
			await fs.rm(server.directory, { recursive: true, force: true });
		}

		await ServerRepository.delete(serverId);
		return { status: 'REMOVED' };
	} catch {
		return { status: 'ERROR' };
	}
}
