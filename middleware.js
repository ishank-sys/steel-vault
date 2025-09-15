import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // Case 1: Not logged in → block /dashboard
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", req.url)); // send to login page
  }

  // Case 2: Logged in → prevent going back to /
  if (token && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Allow everything else
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"], // check both login and dashboard
};
