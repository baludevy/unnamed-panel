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
        version: string;
        type: string;
        directory: string;
        eula: boolean;
    }) {
        const config: ContainerCreateOptions = {
            Image: MC_IMAGE,
            name: `mc-${params.name.replace(/[^a-zA-Z0-9-_]/g, '')}-${params.serverId}`,
            Labels: {
                'mc.server_id': params.serverId,
                'mc.name': params.name,
                'mc.port': String(params.port),
                'mc.version': params.version,
                'mc.type': params.type,
                'mc.data_dir': params.directory
            },
            Env: [`EULA=${params.eula}`, `VERSION=${params.version}`, `TYPE=${params.type}`],
            ExposedPorts: { '25565/tcp': {} },
            HostConfig: {
                PortBindings: { '25565/tcp': [{ HostPort: String(params.port) }] },
                Binds: [`${params.directory}:/data`],
                RestartPolicy: { Name: 'unless-stopped' }
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
        const container = docker.getContainer(containerId);
        await container.start();
    },

    async stopContainer(containerId: string) {
        const container = docker.getContainer(containerId);
        await container.stop();
    },

    async inspectContainer(containerId: string) {
        const container = docker.getContainer(containerId);
        return await container.inspect();
    },

    async needsRecreation(
        containerId: string,
        expected: { port: number; version: string; type: string; directory: string }
    ) {
        try {
            const container = docker.getContainer(containerId);
            const inspect = await container.inspect();

            const currentEnv = inspect.Config.Env;
            const hasVersion = currentEnv.includes(`VERSION=${expected.version}`);
            const hasType = currentEnv.includes(`TYPE=${expected.type}`);

            const portBinding = inspect.HostConfig.PortBindings?.['25565/tcp']?.[0]?.HostPort;
            const hasPort = portBinding === String(expected.port);

            const expectedBind = `${path.resolve(expected.directory)}:/data`;
            const currentBinds = inspect.HostConfig.Binds || [];
            const hasCorrectVolume = currentBinds.includes(expectedBind);

            return !hasVersion || !hasType || !hasPort || !hasCorrectVolume;
        } catch {
            return true;
        }
    },

    async getContainerStats(containerId: string) {
        const container = docker.getContainer(containerId);
        return await container.stats({ stream: true });
    }
};