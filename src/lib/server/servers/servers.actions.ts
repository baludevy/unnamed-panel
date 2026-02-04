import path from 'node:path';
import fs from 'node:fs/promises';
import { ServerRepository } from './servers.repository';
import { DockerService } from './docker.service';
import { generateServerId } from './servers.helper';
import { ensurePortFree, ensureDataDirFree, ensureImageExists, MC_IMAGE } from './servers.helper';
import type { ServerCreationPayload, MinecraftServerInfo } from './servers.schema';
import docker from '$lib/server/docker/client';
import type { ContainerInfo } from 'dockerode';

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

		return {
			...server,
			state: currentState
		};
	});
}

export async function createMinecraftServer(payload: ServerCreationPayload) {
	const absDir = path.resolve(payload.directory);
	await ensurePortFree(payload.port);
	await ensureDataDirFree(absDir);
	await ensureImageExists(MC_IMAGE);

	const serverId = generateServerId();

	try {
		const container = await DockerService.createServerContainer({
			...payload,
			serverId,
			directory: absDir
		});

		const server = await ServerRepository.create(serverId, container.id, payload, absDir);
		await refreshContainerCache();
		return server;
	} catch (err: any) {
		const msg = err?.json?.message || err?.message || '';
		if (msg.includes('port is already allocated')) {
			throw new Error(`Port ${payload.port} already in use`);
		}
		throw err;
	}
}

export async function removeMinecraftServer(serverId: string, deleteData = true) {
	const server = await ServerRepository.getById(serverId);
	if (!server) return false;

	await DockerService.stopAndRemove(server.containerId);

	const leftover = await DockerService.findContainerByLabel(serverId);
	if (leftover) await DockerService.stopAndRemove(leftover.Id);

	if (deleteData) {
		await fs.rm(server.directory, { recursive: true, force: true }).catch(() => {});
	}

	await ServerRepository.delete(serverId);
	await refreshContainerCache();
	return true;
}

export async function startMinecraftServer(serverId: string) {
	const server = await ServerRepository.getById(serverId);
	if (!server) throw new Error('Server not found');

	let container: ContainerInfo | null = await DockerService.findContainerByLabel(serverId);
	let wasRecreated = false;

	if (container) {
		const needsFix = await DockerService.needsRecreation(container.Id, {
			port: server.port,
			version: server.version,
			type: server.type,
			directory: server.directory
		});

		if (needsFix) {
			await DockerService.stopAndRemove(container.Id);
			container = null;
		}
	}

	if (!container) {
		const newContainer = await DockerService.createServerContainer({
			name: server.name,
			port: server.port,
			version: server.version,
			type: server.type,
			eula: true,
			serverId: server.id,
			directory: server.directory
		});

		await ServerRepository.updateContainerId(server.id, newContainer.id);
		wasRecreated = true;
		await refreshContainerCache();
		container = containerCache.find((c) => c.Id === newContainer.id) || null;
	}

	if (container && !wasRecreated) {
		const inspect = await DockerService.inspectContainer(container.Id);
		if (!inspect.State.Running) {
			await DockerService.startContainer(container.Id);
		}
	}
	await refreshContainerCache();
}

export async function restartMinecraftServer(serverId: string) {
	const server = await ServerRepository.getById(serverId);
	if (!server) throw new Error('Server not found');

	const container = await DockerService.findContainerByLabel(serverId);
	if (container) {
		await DockerService.stopContainer(container.Id).catch(() => {});
	}

	await startMinecraftServer(serverId);
}

export async function stopMinecraftServer(serverId: string) {
	const server = await ServerRepository.getById(serverId);
	if (!server) throw new Error(`No server record found for ${serverId}`);

	let containerId = server.containerId;

	try {
		const inspect = await DockerService.inspectContainer(containerId);
		if (!inspect.State.Running) return;
	} catch (err) {
		const container = await DockerService.findContainerByLabel(serverId);
		if (container) {
			containerId = container.Id;
			await ServerRepository.updateContainerId(serverId, containerId);
		} else {
			return;
		}
	}

	await DockerService.stopContainer(containerId);
	await refreshContainerCache();
}

export async function editMinecraftServer(
	serverId: string,
	payload: Partial<ServerCreationPayload>
) {
	const server = await ServerRepository.getById(serverId);
	if (!server) throw new Error('Server not found');

	const updatedData = {
		name: payload.name ?? server.name,
		port: payload.port ?? server.port,
		version: payload.version ?? server.version,
		type: (payload.type ?? server.type) as 'VANILLA' | 'FORGE' | 'FABRIC' | 'SPIGOT',
		directory: payload.directory ? path.resolve(payload.directory) : server.directory
	};

	if (payload.port && payload.port !== server.port) {
		await ensurePortFree(payload.port);
	}

	if (payload.directory && updatedData.directory !== server.directory) {
		await ensureDataDirFree(updatedData.directory);
	}

	await ServerRepository.update(serverId, updatedData);
	await refreshContainerCache();
	return true;
}
