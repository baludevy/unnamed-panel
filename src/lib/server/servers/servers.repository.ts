import { prisma } from '$lib/server/prisma/prisma';
import type { ServerCreationPayload } from './servers.schema';

export const ServerRepository = {
	async getAll() {
		return prisma.server.findMany();
	},

	async getById(id: string) {
		return prisma.server.findUnique({ where: { id } });
	},

	async create(id: string, containerId: string, payload: ServerCreationPayload, directory: string) {
		return prisma.server.create({
			data: {
				id,
				containerId,
				name: payload.name,
				port: payload.port,
				version: payload.version,
				type: payload.type,
				directory
			}
		});
	},

	async updateContainerId(id: string, containerId: string) {
		return prisma.server.update({
			where: { id },
			data: { containerId }
		});
	},

	async delete(id: string) {
		return prisma.server.delete({ where: { id } });
	},

	async update(id: string, data: Partial<ServerCreationPayload>) {
		return prisma.server.update({
			where: { id },
			data: {
				name: data.name,
				port: data.port,
				version: data.version,
				type: data.type,
				directory: data.directory
			}
		});
	}
};
