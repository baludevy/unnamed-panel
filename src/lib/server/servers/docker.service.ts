import type { ContainerCreateOptions } from 'dockerode';
import docker from '$lib/server/docker/client';
import { MC_IMAGE } from '$lib/server/servers/servers.helper';
import path from 'node:path';

export const DockerService = {
	async findContainerByLabel(serverId: string) {
		const containers = await docker.listContainers({
			all: true,
			filters: { label: [`mc.server_id=${serverId}`] }
		});
		return containers[0] || null;
	},

	async createServerContainer(params: {
		name: string;
		serverId: string;
		port: number;
		containerPort: number;
		additionalPorts: { host: number; container: number }[];
		version: string;
		type: string;
		directory: string;
		eula: boolean;
		cpuLimit: number;
		memoryLimit: number;
	}) {
		const exposedPorts: any = {};
		const portBindings: any = {};

		const mainContainerPort = `${params.containerPort}/tcp`;
		exposedPorts[mainContainerPort] = {};
		portBindings[mainContainerPort] = [{ HostPort: String(params.port) }];

		for (const mapping of params.additionalPorts) {
			const cPort = `${mapping.container}/tcp`;
			exposedPorts[cPort] = {};
			portBindings[cPort] = [{ HostPort: String(mapping.host) }];
		}

		const config: ContainerCreateOptions = {
			Image: MC_IMAGE,
			name: `mc-${params.name.replace(/[^a-zA-Z0-9-_]/g, '')}-${params.serverId}`,
			Labels: {
				'mc.server_id': params.serverId,
				'mc.name': params.name,
				'mc.port': String(params.port),
				'mc.container_port': String(params.containerPort),
				'mc.version': params.version,
				'mc.type': params.type,
				'mc.data_dir': params.directory
			},
			Env: [
				`EULA=${params.eula}`,
				`VERSION=${params.version}`,
				`TYPE=${params.type}`,
				`SERVER_PORT=${params.containerPort}`
			],
			ExposedPorts: exposedPorts,
			HostConfig: {
				PortBindings: portBindings,
				Binds: [`${params.directory}:/data`],
				RestartPolicy: { Name: 'unless-stopped' },
				Memory: params.memoryLimit * 1024 * 1024,
				NanoCpus: params.cpuLimit * 1e9
			}
		};

		const container = await docker.createContainer(config);
		await container.start();
		return container;
	},

	async stopAndRemove(containerId: string) {
		try {
			const container = docker.getContainer(containerId);
			await container.stop().catch(() => {});
			await container.remove({ v: true, force: true });
		} catch {}
	},

	async startContainer(containerId: string) {
		await docker.getContainer(containerId).start();
	},

	async stopContainer(containerId: string) {
		await docker.getContainer(containerId).stop();
	},

	async inspectContainer(containerId: string) {
		return await docker.getContainer(containerId).inspect();
	},

	async needsRecreation(
		containerId: string,
		expected: {
			port: number;
			containerPort: number;
			additionalPorts: { host: number; container: number }[];
			version: string;
			type: string;
			directory: string;
			cpuLimit: number;
			memoryLimit: number;
		}
	) {
		try {
			const inspect = await docker.getContainer(containerId).inspect();

			const currentEnv = inspect.Config.Env;
			if (!currentEnv.includes(`VERSION=${expected.version}`)) return true;
			if (!currentEnv.includes(`TYPE=${expected.type}`)) return true;
			if (!currentEnv.includes(`SERVER_PORT=${expected.containerPort}`)) return true;

			const bindings = inspect.HostConfig.PortBindings || {};

			const mainKey = `${expected.containerPort}/tcp`;
			if (bindings[mainKey]?.[0]?.HostPort !== String(expected.port)) return true;

			for (const map of expected.additionalPorts) {
				const key = `${map.container}/tcp`;
				if (bindings[key]?.[0]?.HostPort !== String(map.host)) return true;
			}

			const expectedBind = `${path.resolve(expected.directory)}:/data`;
			const currentBinds = inspect.HostConfig.Binds || [];
			if (!currentBinds.includes(expectedBind)) return true;

			if (inspect.HostConfig.NanoCpus !== expected.cpuLimit * 1e9) return true;
			if (inspect.HostConfig.Memory !== expected.memoryLimit * 1024 * 1024) return true;

			return false;
		} catch {
			return true;
		}
	},

	async getContainerStats(containerId: string) {
		return await docker.getContainer(containerId).stats({ stream: true });
	}
};
