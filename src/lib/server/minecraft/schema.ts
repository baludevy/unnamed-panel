import { z } from 'zod';

export interface MinecraftServerInfo {
	id: string;
	name: string;
	port: number | null;
	version: string;
	type: string;
	directory: string;
	state: string;
}

const VERSION_PATTERN = /^[\d\.]+w[\d]+[a-z]|[\d\.\-]+(pre|rc)?[\d]*$/;

const VersionRegex = z
	.string()
	.regex(
		VERSION_PATTERN,
		'Version format is invalid. must be x.x.x, x.x.x-preN, or snapshot format.'
	);

export const ServerCreateSchema = z.object({
	name: z.string().trim().min(3),
	hostPort: z.number().int().min(1024).max(65535).optional().default(25565),
	version: z.string().default('latest'),
	type: z.enum(['VANILLA', 'FORGE', 'FABRIC', 'SPIGOT']).default('VANILLA'),
	directory: z.string(),
	eula: z.boolean().refine((val) => val === true, { message: 'EULA must be accepted' })
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