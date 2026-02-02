import docker from '$lib/server/docker/client';
import path from 'node:path';
import net from 'node:net';

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

export function checkPortOnHost(hostPort: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.once('error', () => resolve(false));
		server.once('listening', () => {
			server.close(() => resolve(true));
		});
		server.listen(hostPort, '0.0.0.0');
	});
}

export async function ensurePortFree(hostPort: number) {
	const containers = await docker.listContainers({ all: true });
	for (const c of containers) {
		const ports = c.Ports || [];
		for (const p of ports) {
			if (!p.PublicPort) continue;
			if (p.Type !== 'tcp') continue;
			if (Number(p.PublicPort) === hostPort) {
				console.log(`Port ${hostPort} already in use by container ${c.Id?.slice(0, 12)}`);
				throw new Error(`Port ${hostPort} already in use`);
			}
		}
	}

	const freeOnHost = await checkPortOnHost(hostPort);
	if (!freeOnHost) {
		console.log(`Port ${hostPort} already in use on host`);
		throw new Error(`Port ${hostPort} already in use`);
	}
}

export async function ensureDataDirFree(absDir: string) {
	const containers = await docker.listContainers({ all: true });
	for (const c of containers) {
		const labels = c.Labels || {};
		if (labels['mc.data_dir'] && path.resolve(labels['mc.data_dir']) === absDir) {
			console.log(`Data dir ${absDir} already used by container ${c.Id?.slice(0, 12)}`);
			throw new Error(`Data directory already used by another server`);
		}
	}
}
