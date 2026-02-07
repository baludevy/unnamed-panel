import { Rcon } from 'rcon-client';
import { ServerRepository } from '$lib/server/servers/repository';

const activeConnections = new Map<string, Rcon>();

export const RconService = {
    async executeCommand(serverId: string, command: string) {
        try {
            const rcon = await this.getConnection(serverId);
            const response = await rcon.send(command);
            return { success: true, response };
        } catch (error: any) {
            this.closeConnection(serverId);
            try {
                const retryRcon = await this.getConnection(serverId);
                const retryResponse = await retryRcon.send(command);
                return { success: true, response: retryResponse };
            } catch (retryError: any) {
                return { success: false, error: retryError.message };
            }
        }
    },

    async getConnection(serverId: string): Promise<Rcon> {
        const existing = activeConnections.get(serverId);
        if (existing) return existing;

        const server = await ServerRepository.getById(serverId);
        if (!server) throw new Error('Server not found');

        const rcon = new Rcon({
            host: 'localhost',
            port: server.rconPort,
            password: server.rconPassword,
            timeout: 5000
        });

        rcon.on('error', () => this.closeConnection(serverId));
        rcon.on('end', () => this.closeConnection(serverId));

        await rcon.connect();
        activeConnections.set(serverId, rcon);
        
        return rcon;
    },

    closeConnection(serverId: string) {
        const rcon = activeConnections.get(serverId);
        if (rcon) {
            activeConnections.delete(serverId);
            rcon.end().catch(() => {});
        }
    }
};