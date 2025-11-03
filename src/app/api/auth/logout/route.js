import { NextResponse } from 'next/server';

export async function POST(request) {
  // Expire all cookies that the client sent in the request.
  // This is a best-effort 'clear all' logout: we read the Cookie header and
  // emit Set-Cookie entries with expired dates for each name.
  const response = NextResponse.json({ message: 'Logged out' });

  // If a cookie header exists, parse names and expire them all.
  // We'll also try to expire those cookies with a couple of domain variants
  // (host and .host) so browsers will remove cookies set for the domain.
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieNames = cookieHeader
      .split(';')
      .map((c) => c.split('=')[0].trim())
      .filter(Boolean);

    // Always expire the app 'token' as well, even if not present in header
    if (!cookieNames.includes('token')) cookieNames.push('token');

    const host = (request.headers.get('host') || '').split(':')[0];
    const domains = host ? [host, `.${host}`] : [undefined];

    for (const name of cookieNames) {
      // Emit multiple Set-Cookie variants to maximize chance of removal
      for (const domain of domains) {
        const opts = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          expires: new Date(0),
        };
        if (domain) opts.domain = domain;
        try {
          response.cookies.set(name, '', opts);
        } catch (e) {
          // ignore failures for individual cookies
        }
      }
      // Also set a cookie without domain (some cookies are host-only)
      try {
        response.cookies.set(name, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          expires: new Date(0),
        });
      } catch (e) {}
    }
  } catch (e) {
    // Don't fail logout if cookie parsing fails
    console.warn('logout: failed to clear all cookies', e?.message || e);
  }

  // Also attempt to expire a few common NextAuth cookie names in case they weren't
  // included in the Cookie header for some reason.
  const fallback = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
    'next-auth.redirect',
  ];

  for (const name of fallback) {
    response.cookies.set(name, '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
  }

  return response;
}
