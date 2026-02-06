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
	MC_IMAGE
} from './helper';
import type { ServerCreationPayload, MinecraftServerInfo } from './schema';

let containerCache: ContainerInfo[] = [];

async function refreshContainerCache() {
	containerCache = await docker.listContainers({ all: true });
}

function findContainer(id: string, containerId: string | null) {
	if (containerId) {
		const direct = containerCache.find((c) => c.Id === containerId);
		if (direct) return direct;
	}

	return containerCache.find((c) => c.Labels?.['mc.server_id'] === id) || null;
}

function deriveState(container: ContainerInfo | null) {
	return container ? container.State : 'missing';
}

export async function listMinecraftServers(): Promise<MinecraftServerInfo[]> {
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

	await ensureImageExists(MC_IMAGE);

	const serverId = generateServerId();
	const container = await DockerService.createServerContainer({
		...payload,
		serverId,
		directory,
		eula: true
	});

	const record = await ServerRepository.create(serverId, container.id, payload, directory);

	await refreshContainerCache();
	return record;
}

export type StartStatus = 'NOT_FOUND' | 'ALREADY_RUNNING' | 'STARTED';

export async function startMinecraftServer(serverId: string): Promise<{ status: StartStatus }> {
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
			memoryLimit: server.memoryLimit
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
		await refreshContainerCache();
		return { status: 'STARTED' };
	}

	if (await DockerService.isRunning(container.Id)) {
		return { status: 'ALREADY_RUNNING' };
	}

	await DockerService.startContainer(container.Id);
	await refreshContainerCache();
	return { status: 'STARTED' };
}

export async function stopMinecraftServer(serverId: string) {
	const server = await ServerRepository.getById(serverId);
	if (!server) return { status: 'NOT_FOUND' };

	const id = server.containerId || (await DockerService.findContainerByLabel(serverId))?.Id;

	if (!id) return { status: 'NOT_FOUND' };

	if (!(await DockerService.isRunning(id))) {
		return { status: 'ALREADY_STOPPED' };
	}

	await DockerService.stopContainer(id);
	await refreshContainerCache();
	return { status: 'STOPPED' };
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
			if (!server.additionalPorts.some((p: any) => p.host === extra.host)) {
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
	const server = await ServerRepository.getById(serverId);
	if (!server) return { status: 'NOT_FOUND' };

	if (server.containerId) {
		await DockerService.stopAndRemove(server.containerId);
	}

	if (deleteData) {
		await fs.rm(server.directory, { recursive: true, force: true });
	}

	await ServerRepository.delete(serverId);
	await refreshContainerCache();
	return { status: 'REMOVED' };
}
