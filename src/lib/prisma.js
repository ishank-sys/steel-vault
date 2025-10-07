// /src/lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function normalizeDatabaseUrl(raw) {
	if (!raw) return raw;
	let url = raw.trim();
	if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
		url = url.slice(1, -1);
	}
	// Remove duplicate protocol (rare accidental paste)
	url = url.replace(/^postgresql:\/\/postgres:\/\//, 'postgresql://');
	return url;
}

const originalUrl = process.env.DATABASE_URL;
const normalizedUrl = normalizeDatabaseUrl(originalUrl);
if (originalUrl !== normalizedUrl) {
	process.env.DATABASE_URL = normalizedUrl; // let Prisma use cleaned value
}

// Basic sanitized log once (avoid logging secrets)
if (!globalForPrisma.__prismaLogged) {
	const display = (normalizedUrl || '').replace(/:(?:[^:@/]{4,})(?=@)/, ':***');
	console.log('[prisma:init]', {
		length: normalizedUrl?.length,
		startsWith: normalizedUrl?.slice(0, 18),
		containsPgBouncer: /pgbouncer=true/.test(normalizedUrl || ''),
		port: (normalizedUrl || '').match(/:(\d+)\//)?.[1] || null,
		sanitized: display?.slice(0, 80) + '...'
	});
	globalForPrisma.__prismaLogged = true;
}

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;