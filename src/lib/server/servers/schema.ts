import { z } from 'zod';

export interface MinecraftServerInfo {
	id: string;
	name: string;
	port: number;
	containerPort: number;
	additionalPorts: { host: number; container: number }[];
	version: string;
	type: string;
	directory: string;
	containerId?: string | null;
	state: string;
	cpuLimit: number;
	memoryLimit: number;
}

export interface ServerInfo extends MinecraftServerInfo {
	createdAt: string;
	updatedAt: string;
}

export interface ServerStats {
	id: string;
	name: string;
	cpu: number;
	memory: number;
	uptime: string;
	status: string;
	startTime?: number;
}

export const ServerCreateSchema = z.object({
	name: z.string().trim().min(3),
	port: z.number().int().min(1024).max(65535).default(25565),
	containerPort: z.number().int().min(1).max(65535).default(25565),
	additionalPorts: z
		.array(
			z.object({
				host: z.number().int().min(1024).max(65535),
				container: z.number().int().min(1).max(65535)
			})
		)
		.default([]),
	version: z.string().default('latest'),
	type: z.enum(['VANILLA', 'FORGE', 'FABRIC', 'SPIGOT']).default('VANILLA'),
	directory: z.string(),
	eula: z.boolean().refine((val) => val === true, { message: 'EULA must be accepted' }),
	cpuLimit: z.number().min(0.5).max(16).default(2),
	memoryLimit: z.number().min(512).max(32768).default(2048)
});

export type ServerCreationPayload = z.infer<typeof ServerCreateSchema>;

export const ServerStartSchema = z.object({
	id: z.string().min(1)
});

export type ServerStartPayload = z.infer<typeof ServerStartSchema>;

export const ServerStopSchema = z.object({
	id: z.string().min(1)
});

export type ServerStopPayload = z.infer<typeof ServerStopSchema>;
