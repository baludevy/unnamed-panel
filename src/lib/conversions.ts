export function formatBytes(bytes: number) {
	if (bytes === 0) return '0 GB';
	const gb = bytes / (1024 * 1024 * 1024);
	return gb.toFixed(1) + ' GB';
}

export function formatMegabytes(mb: number) {
	if (mb === 0) return '0 GB';
	const gb = mb / 1024;
	return gb.toFixed(1) + ' GB';
}
