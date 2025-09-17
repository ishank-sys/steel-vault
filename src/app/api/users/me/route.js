import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma.js";
import { createHash } from "crypto";

export const runtime = 'nodejs'; // Prisma requires Node runtime

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    // Fetch only what the client needs
    let dbUser = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          userType: true,
          createdAt: true,         // User has createdAt (no updatedAt in schema)
          client: { select: { id: true, name: true, updatedAt: true } }
        }
      });
    } catch (e) {
      // If DB is temporarily unavailable, return session-only data
      console.error('users/me: prisma query failed, falling back to session', e);
    }

    // If user doesn’t exist, still return session info (no DB-derived fields)
    const normType = (session.user.userType || dbUser?.userType || null);
    const sessionId = session.user.id ? Number(session.user.id) : null;
    const lastModified = dbUser?.client?.updatedAt || dbUser?.createdAt || null;
    const payload = {
      // Prefer DB id; fall back to numeric session id
      id: (typeof dbUser?.id === 'number' ? dbUser.id : sessionId),
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      userType: normType,
      client: dbUser?.client ?? null,
      clientId: dbUser?.client?.id ?? null,
      // optional: version for client-side cache keys
      _v: lastModified ? new Date(lastModified).toISOString() : null,
    };

    const body = JSON.stringify(payload);

    // Strong ETag so the browser can use 304s for rapid repeats
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`;
    const ifNoneMatch = (req.headers.get('if-none-match') || '').replace(/W\//, '');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=30',
          ...(lastModified ? { 'Last-Modified': new Date(lastModified).toUTCString() } : {}),
        }
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=30',
        ...(lastModified ? { 'Last-Modified': new Date(lastModified).toUTCString() } : {}),
      }
    });
  } catch (err) {
    console.error('GET /api/users/me error', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
