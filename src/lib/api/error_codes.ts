import { z } from 'zod';

export const ErrorCode = z.enum([
	'NOT_FOUND',
	'MISSING_ID',
	'ALREADY_STOPPED',
	'STOPPED',
	'ALREADY_RUNNING',
	'STARTED'
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorMessages: Record<ErrorCode, string> = {
	NOT_FOUND: 'Server not found',
	MISSING_ID: 'Missing server ID',
	ALREADY_STOPPED: 'Server is already stopped',
	STOPPED: 'Server stopped successfully',
	ALREADY_RUNNING: 'Server is already running',
	STARTED: 'Server started successfully'
};
