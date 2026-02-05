import docker from '$lib/server/docker/client';
import path from 'node:path';
import net from 'node:net';
import { DockerService } from './docker.service';
import type { ContainerInfo } from 'dockerode';
import { ServerRepository } from './repository';

export const MC_IMAGE = 'itzg/minecraft-server';

export async function ensureImageExists(imageName: string) {
	try {
		await docker.getImage(imageName).inspect();
	} catch (e: any) {
		if (e.statusCode === 404) {
			const stream = await docker.pull(imageName, {});
			await new Promise((resolve, reject) => {
				docker.modem.followProgress(stream, (err, output) => {
					if (err) return reject(err);
					resolve(output);
				});
			});
		} else {
			throw e;
		}
	}
}

export function checkPortOnHost(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.once('listening', () => {
			server.close(() => resolve(true));
		});
		server.listen(port, '0.0.0.0');
	});
}

export async function ensurePortFree(port: number) {
	const containers = await docker.listContainers({ all: true });
	for (const c of containers) {
		const ports = c.Ports || [];
		for (const p of ports) {
			if (!p.PublicPort) continue;
			if (p.Type !== 'tcp') continue;
			if (Number(p.PublicPort) === port) {
				throw new Error(`Port ${port} already in use`);
			}
		}
	}

	const freeOnHost = await checkPortOnHost(port);
	if (!freeOnHost) {
		throw new Error(`Port ${port} already in use`);
	}
}

export async function ensureDataDirFree(absDir: string) {
	const containers = await docker.listContainers({ all: true });
	for (const c of containers) {
		const labels = c.Labels || {};
		if (labels['mc.data_dir'] && path.resolve(labels['mc.data_dir']) === path.resolve(absDir)) {
			throw new Error(`Data directory already used by another server`);
		}
	}
}

export async function ensureContainerMatchesDb(server: any) {
	let container: ContainerInfo | null = await DockerService.findContainerByLabel(server.id);

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
		const newContainer = await DockerService.createServerContainer({
			name: server.name,
			port: server.port,
			containerPort: server.containerPort,
			additionalPorts: server.additionalPorts,
			version: server.version,
			type: server.type,
			directory: server.directory,
			eula: true,
			serverId: server.id,
			cpuLimit: server.cpuLimit,
			memoryLimit: server.memoryLimit
		});

		await ServerRepository.updateContainerId(server.id, newContainer.id);
		return newContainer.id;
	}

	return container.Id;
}

export function generateServerId() {
	return 'srv_' + Math.random().toString(36).slice(2, 10);
}
