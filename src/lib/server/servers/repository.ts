import { prisma } from '$lib/server/prisma/prisma';
import type { ServerCreationPayload } from './schema';

export const ServerRepository = {
	async getAll() {
		const servers = await prisma.server.findMany();
		return servers.map((s) => ({
			...s,
			additionalPorts: JSON.parse(s.additionalPorts)
		}));
	},

	async getById(id: string) {
		const server = await prisma.server.findUnique({ where: { id } });
		if (!server) return null;
		return {
			...server,
			additionalPorts: JSON.parse(server.additionalPorts)
		};
	},

	async create(
		id: string,
		containerId: string,
		payload: ServerCreationPayload,
		directory: string,
		rconPassword: string
	) {
		const server = await prisma.server.create({
			data: {
				id,
				containerId,
				name: payload.name,
				port: payload.port,
				containerPort: payload.containerPort,
				additionalPorts: JSON.stringify(payload.additionalPorts),
				version: payload.version,
				type: payload.type,
				directory,
				cpuLimit: payload.cpuLimit,
				memoryLimit: payload.memoryLimit,
				rconPort: payload.rconPort,
				rconPassword
			}
		});

		return {
			...server,
			additionalPorts: JSON.parse(server.additionalPorts)
		};
	},

	async update(id: string, data: any) {
		if (data.additionalPorts) {
			data.additionalPorts = JSON.stringify(data.additionalPorts);
		}

		const server = await prisma.server.update({
			where: { id },
			data
		});
		return {
			...server,
			additionalPorts: JSON.parse(server.additionalPorts)
		};
	},

	async updateContainerId(id: string, containerId: string) {
		return prisma.server.update({
			where: { id },
			data: { containerId }
		});
	},

	async delete(id: string) {
		return prisma.server.delete({ where: { id } });
	}
};
