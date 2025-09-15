import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
    }

    const userEmail = session.user?.email;
    // fetch fresh info from DB including client relation
    let dbUser = null;
    if (userEmail) {
      dbUser = await prisma.user.findUnique({ where: { email: userEmail }, include: { client: true } });
    }

    const user = session.user || {};
    return new Response(JSON.stringify({
      id: dbUser ? dbUser.id : null,
      email: user.email || null,
      name: user.name || null,
      userType: user.userType || (dbUser && dbUser.userType) || null,
      client: dbUser ? dbUser.client : null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('GET /api/users/me error', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
