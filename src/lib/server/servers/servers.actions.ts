import path from 'node:path';
import fs from 'node:fs/promises';
import docker from '$lib/server/docker/client';
import type { ContainerInfo } from 'dockerode';
import { ServerRepository } from './servers.repository';
import { DockerService } from './docker.service';
import {
	generateServerId,
	ensurePortFree,
	ensureDataDirFree,
	ensureImageExists,
	MC_IMAGE
} from './servers.helper';
import type { ServerCreationPayload, MinecraftServerInfo } from './servers.schema';

let containerCache: ContainerInfo[] = [];

export async function refreshContainerCache() {
	containerCache = await docker.listContainers({ all: true });
}

export async function listMinecraftServers(): Promise<MinecraftServerInfo[]> {
	await refreshContainerCache();
	const servers = await ServerRepository.getAll();

	return servers.map((server) => {
		const container =
			containerCache.find((c) => c.Id === server.containerId) ||
			containerCache.find((c) => c.Labels?.['mc.server_id'] === server.id);

		const currentState = container ? container.State : 'missing';

		const serverWithState = server as typeof server & { state?: string };

		if (serverWithState.state !== currentState) {
			ServerRepository.update(server.id, { state: currentState }).catch(() => {});
		}

		return {
			...server,
			state: currentState
		};
	});
}

export async function createMinecraftServer(payload: ServerCreationPayload) {
	const absDir = path.resolve(payload.directory);

	await ensurePortFree(payload.port);
	for (const extra of payload.additionalPorts) {
		await ensurePortFree(extra.host);
	}

	await ensureDataDirFree(absDir);
	await ensureImageExists(MC_IMAGE);

	const serverId = generateServerId();
	const container = await DockerService.createServerContainer({
		...payload,
		serverId,
		directory: absDir,
		eula: true
	});

	const record = await ServerRepository.create(serverId, container.id, payload, absDir);
	await refreshContainerCache();
	return record;
}

export async function startMinecraftServer(serverId: string) {
	const server = await ServerRepository.getById(serverId);
	if (!server) throw new Error('Not found');

	let container: ContainerInfo | null = await DockerService.findContainerByLabel(serverId);
	let wasRecreated = false;

	if (container) {
		const needsFix = await DockerService.needsRecreation(container.Id, {
			port: server.port,
			containerPort: server.containerPort,
			additionalPorts: server.additionalPorts,
			version: server.version,
			type: server.type,
			directory: server.directory,
			cpuLimit: server.cpuLimit,
			memoryLimit: server.memoryLimit
		});

		if (needsFix) {
			await DockerService.stopAndRemove(container.Id);
			container = null;
		}
	}

	if (!container) {
		const newC = await DockerService.createServerContainer({
			...server,
			eula: true,
			serverId: server.id,
			directory: server.directory
		});
		await ServerRepository.updateContainerId(server.id, newC.id);
		wasRecreated = true;
	}

	if (!wasRecreated) {
		const c = await DockerService.findContainerByLabel(serverId);
		if (c) {
			const inspect = await DockerService.inspectContainer(c.Id);
			if (!inspect.State.Running) await DockerService.startContainer(c.Id);
		}
	}
	await refreshContainerCache();
}

export async function stopMinecraftServer(serverId: string) {
	const server = await ServerRepository.getById(serverId);
	if (!server) return;
	try {
		await DockerService.stopContainer(server.containerId || '');
	} catch {
		const c = await DockerService.findContainerByLabel(serverId);
		if (c) await DockerService.stopContainer(c.Id);
	}
	await refreshContainerCache();
}

export async function restartMinecraftServer(serverId: string) {
	await stopMinecraftServer(serverId);
	await startMinecraftServer(serverId);
}

export async function editMinecraftServer(
	serverId: string,
	payload: Partial<ServerCreationPayload>
) {
	const server = await ServerRepository.getById(serverId);
	if (!server) throw new Error('Not found');

	const updated = {
		...server,
		...payload,
		directory: payload.directory ? path.resolve(payload.directory) : server.directory
	};

	if (payload.port && payload.port !== server.port) await ensurePortFree(payload.port);

	if (payload.additionalPorts) {
		for (const extra of payload.additionalPorts) {
			if (!server.additionalPorts.find((p: any) => p.host === extra.host)) {
				await ensurePortFree(extra.host);
			}
		}
	}

	await ServerRepository.update(serverId, updated);
	await refreshContainerCache();
}

export async function removeMinecraftServer(serverId: string, deleteData = true) {
	const server = await ServerRepository.getById(serverId);
	if (!server) return false;
	await DockerService.stopAndRemove(server.containerId || '');
	if (deleteData) await fs.rm(server.directory, { recursive: true, force: true }).catch(() => {});
	await ServerRepository.delete(serverId);
	await refreshContainerCache();
	return true;
}
