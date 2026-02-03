import path from 'node:path';
import fs from 'node:fs/promises';
import { ServerRepository } from './server.repository';
import { DockerService } from './docker.service';
import { generateServerId } from './server.helper';
import {
	ensurePortFree,
	ensureDataDirFree,
	ensureImageExists,
	ensureContainerMatchesDb,
	MC_IMAGE
} from './server.helper';
import type { ServerCreationPayload, MinecraftServerInfo } from './server.schema';
import docker from '$lib/server/docker/client';

export async function listMinecraftServers(): Promise<MinecraftServerInfo[]> {
	const [servers, containers] = await Promise.all([
		ServerRepository.getAll(),
		docker.listContainers({ all: true })
	]);

	return Promise.all(
		servers.map(async (server) => {
			let container = containers.find((c) => c.Id === server.containerId);

			if (!container) {
				container = containers.find((c) => c.Labels?.['mc.server_id'] === server.id) || undefined;
				if (container) {
					await ServerRepository.updateContainerId(server.id, container.Id);
				}
			}

			return {
				id: server.id,
				name: server.name,
				port: server.port,
				version: server.version,
				type: server.type,
				directory: server.directory,
				state: container ? container.State : 'missing'
			};
		})
	);
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

		return await ServerRepository.create(serverId, container.id, payload, absDir);
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
	return true;
}

import type { ContainerInfo } from 'dockerode';

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

		const list = await docker.listContainers({ all: true, filters: { id: [newContainer.id] } });
		container = list[0] || null;
	}

	if (container && !wasRecreated) {
		const inspect = await DockerService.inspectContainer(container.Id);
		if (!inspect.State.Running) {
			await DockerService.startContainer(container.Id);
		}
	}
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
}
