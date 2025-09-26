import dns from 'dns';
import net from 'net';
import tls from 'tls';

export const runtime = 'nodejs';

function parseDbUrl(url) {
  // Basic parse without full dependency
  // pattern: protocol://user:pass@host:port/db?query
  const m = url.match(/^[a-zA-Z0-9+]+:\/\/(?:[^@]+@)?([^/:?#]+)(?::(\d+))?/);
  const host = m ? m[1] : null;
  const port = m && m[2] ? parseInt(m[2], 10) : null;
  return { host, port };
}

async function tcpAttempt(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port });
    let done = false;
    const finish = (ok, extra = {}) => {
      if (done) return; done = true;
      socket.destroy();
      resolve({ ok, latencyMs: Date.now() - start, ...extra });
    };
    socket.once('connect', () => finish(true));
    socket.once('error', (err) => finish(false, { error: err.message }));
    socket.setTimeout(timeoutMs, () => finish(false, { error: 'timeout' }));
  });
}

async function tlsAttempt(host, port, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false });
    let done = false;
    const finish = (ok, extra = {}) => {
      if (done) return; done = true;
      socket.destroy();
      resolve({ ok, latencyMs: Date.now() - start, ...extra });
    };
    socket.once('secureConnect', () => finish(true, { protocol: socket.getProtocol() }));
    socket.once('error', (err) => finish(false, { error: err.message }));
    socket.setTimeout(timeoutMs, () => finish(false, { error: 'timeout' }));
  });
}

export async function GET() {
  const urlRaw = process.env.DATABASE_URL || '';
  const trimmed = urlRaw.trim();
  const hasOuterQuotes = /^".*"$/.test(trimmed) || /^'.*'$/.test(trimmed);
  const unquoted = hasOuterQuotes ? trimmed.slice(1, -1) : trimmed;
  const { host, port } = parseDbUrl(unquoted);
  const results = { host, port, hasOuterQuotes, length: unquoted.length };

  if (!host) {
    return new Response(JSON.stringify({ ok: false, error: 'Could not parse host from DATABASE_URL', meta: results }), { status: 400 });
  }

  // DNS lookup
  try {
    const lookupStart = Date.now();
    const addresses = await dns.promises.lookup(host, { all: true });
    results.dns = { latencyMs: Date.now() - lookupStart, addresses };
  } catch (e) {
    results.dns = { error: e.message };
    return new Response(JSON.stringify({ ok: false, stage: 'dns', meta: results }), { status: 500 });
  }

  // TCP attempt (pooled port or provided port)
  if (port) {
    results.tcp = await tcpAttempt(host, port);
  }

  // TLS attempt if tcp succeeded
  if (results.tcp?.ok) {
    results.tls = await tlsAttempt(host, port);
  }

  // If primary port is 6543 also test 5432
  if (port === 6543) {
    results.direct5432 = await tcpAttempt(host, 5432);
    if (results.direct5432.ok) {
      results.direct5432Tls = await tlsAttempt(host, 5432);
    }
  }

  const overallOk = !!(results.tls?.ok || results.direct5432Tls?.ok);
  return new Response(JSON.stringify({ ok: overallOk, meta: results }), { status: overallOk ? 200 : 500, headers: { 'content-type': 'application/json' } });
}
