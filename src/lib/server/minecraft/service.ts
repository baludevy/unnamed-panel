import type { ContainerCreateOptions } from 'dockerode';
import docker from '$lib/server/docker/client';
import { ensureImageExists, MC_IMAGE } from './helper';
import type { ServerCreationPayload, MinecraftServerInfo } from './schema';
import { generateServerId } from './id';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensurePortFree, ensureDataDirFree } from './helper';

export async function listMinecraftServers(): Promise<MinecraftServerInfo[]> {
	const containers = await docker.listContainers({
		all: true,
		filters: { label: ['mc.server_id'] }
	});
	return containers.map((info) => ({
		id: info.Labels?.['mc.server_id'] || '',
		name: info.Labels?.['mc.name'] || 'Unknown',
		port: info.Labels?.['mc.port'] ? Number(info.Labels['mc.port']) : null,
		version: info.Labels?.['mc.version'] || 'Unknown',
		type: info.Labels?.['mc.type'] || 'Unknown',
		directory: info.Labels?.['mc.data_dir'] || 'Unknown',
		state: info.State
	}));
}

export async function createMinecraftServer(payload: ServerCreationPayload) {
	const { name, hostPort, version, type, directory, eula } = payload;

	const absDir = path.resolve(directory);

	console.log(`Creating server on port ${hostPort} with data dir ${absDir}`);
	await ensurePortFree(hostPort);
	await ensureDataDirFree(absDir);

	const serverId = generateServerId();
	const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, '');
	const containerName = `mc-${cleanName}-${serverId}`;

	await ensureImageExists(MC_IMAGE);

	const containerConfig: ContainerCreateOptions = {
		Image: MC_IMAGE,
		name: containerName,
		Labels: {
			'mc.server_id': serverId,
			'mc.name': name,
			'mc.port': String(hostPort),
			'mc.version': version,
			'mc.type': type,
			'mc.data_dir': absDir
		},
		Env: [`EULA=${eula}`, `VERSION=${version}`, `TYPE=${type}`],
		ExposedPorts: { '25565/tcp': {} },
		HostConfig: {
			PortBindings: { '25565/tcp': [{ HostPort: String(hostPort) }] },
			Binds: [`${absDir}:/data`],
			RestartPolicy: { Name: 'unless-stopped' }
		}
	};

	const container = await docker.createContainer(containerConfig);

	try {
		await container.start();
		console.log(`Server ${serverId} started on port ${hostPort}`);
	} catch (err: any) {
		console.log(`Failed to start server ${serverId} on port ${hostPort}`);

		try {
			await container.remove({ force: true });
			console.log(`Removed failed container ${serverId}`);
		} catch {}

		const msg = err?.json?.message || err?.message || '';
		if (msg.includes('port is already allocated')) {
			console.log(`Docker reported port ${hostPort} already allocated`);
			throw new Error(`Port ${hostPort} already in use`);
		}

		throw err;
	}

	return {
		id: serverId,
		name,
		port: hostPort,
		version,
		type: type,
		directory: absDir
	};
}

export async function removeMinecraftServer(serverId: string, deleteData = true) {
	console.log(`Removing server ${serverId}`);

	const containers = await docker.listContainers({
		all: true,
		filters: { label: [`mc.server_id=${serverId}`] }
	});

	if (!containers.length) {
		console.log(`No container found for server ${serverId}`);
		return false;
	}

	const info = containers[0];
	const container = docker.getContainer(info.Id);
	const dataDir: string | undefined = info.Labels?.['mc.data_dir'];

	try {
		if (info.State === 'running') {
			console.log(`Stopping container for server ${serverId}`);
			await container.stop();
		}
	} catch {}

	console.log(`Removing container for server ${serverId}`);
	await container.remove({ v: true, force: true });

	if (deleteData && dataDir) {
		try {
			console.log(`Deleting data directory ${dataDir} for server ${serverId}`);
			await fs.rm(dataDir, { recursive: true, force: true });
		} catch {}
	}

	return true;
}

export async function startMinecraftServer(serverId: string) {
	const containers = await docker.listContainers({
		all: true,
		filters: { label: [`mc.server_id=${serverId}`] }
	});
	if (!containers.length) {
		throw new Error(`No container found for server ${serverId}`);
	}

	const info = containers[0];
	const container = docker.getContainer(info.Id);

	if (info.State === 'running') {
		console.log(`Container for server ${serverId} is already running`);
		return;
	}

	console.log(`Starting container for server ${serverId}`);
	await container.start();
}

export async function stopMinecraftServer(serverId: string) {
	const containers = await docker.listContainers({
		all: true,
		filters: { label: [`mc.server_id=${serverId}`] }
	});
	if (!containers.length) {
		throw new Error(`No container found for server ${serverId}`);
	}

	const info = containers[0];
	const container = docker.getContainer(info.Id);

	if (info.State !== 'running') {
		console.log(`Container for server ${serverId} is not running`);
		return;
	}

	console.log(`Stopping container for server ${serverId}`);
	await container.stop();
}
