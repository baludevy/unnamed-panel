import { EventEmitter } from 'node:events';

class LogManager extends EventEmitter {
	private static instance: LogManager;

	private constructor() {
		super();
	}

	public static getInstance(): LogManager {
		if (!LogManager.instance) {
			LogManager.instance = new LogManager();
		}
		return LogManager.instance;
	}

	public emitLog(serverId: string, line: string) {
		this.emit(`log:${serverId}`, line);
	}
}

export const logManager = LogManager.getInstance();
