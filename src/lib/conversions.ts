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

export function formatBytesAuto(bytes: number) {
	if (bytes === 0) return '0 MB';

	const mb = bytes / (1024 * 1024);
	if (mb < 1024) return mb.toFixed(1) + ' MB';

	const gb = mb / 1024;
	return gb.toFixed(1) + ' GB';
}