// The real lets against a T3 server that accepts the WebSocket and never
// answers. This test's process plays the server, so it is the ancestor that
// t3 looks for.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ENTRY = fileURLToPath(new URL('../../../../lets/bin/lets', import.meta.url));
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// A server that gives a ticket, accepts the upgrade, then ignores every
// frame, the Close frame too.
async function silentT3() {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ ticket: 'TICKET' }));
  });
  server.on('upgrade', (request, socket) => {
    const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}${WEBSOCKET_GUID}`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.on('data', () => {});
  });
  await new Promise<void>((listening) => server.listen(0, '127.0.0.1', listening));
  return { server, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

test('lets exits within 15 s when T3 accepts the WebSocket and never replies', { timeout: 30_000 }, async () => {
  const { server, origin } = await silentT3();
  const home = mkdtempSync(join(tmpdir(), 'lets-t3-exit-'));
  mkdirSync(join(home, 't3', 'userdata'), { recursive: true });
  writeFileSync(join(home, 't3', 'userdata', 'server-runtime.json'), JSON.stringify({ pid: process.pid, origin }));
  mkdirSync(join(home, 'config', 'lets'), { recursive: true });
  writeFileSync(join(home, 'config', 'lets', 'config.yaml'), 'version: 3\ndelegate: { resolvers: [t3] }\n');
  writeFileSync(join(home, 'config', 'lets', 't3-token'), 'tok');
  const started = Date.now();
  const { code, stdout, stderr } = await new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => {
    execFile(process.execPath, [ENTRY, 'delegate', 'review', 'instructions', '--for', 'code'], {
      env: { ...process.env, T3CODE_HOME: join(home, 't3'), XDG_CONFIG_HOME: join(home, 'config') },
      timeout: 20_000,
    }, (error, out, err) => done({ code: error ? (typeof error.code === 'number' ? error.code : null) : 0, stdout: out, stderr: err }));
  });
  server.closeAllConnections();
  server.close();
  assert.equal(code, 0, stderr);
  assert.ok(Date.now() - started < 15_000, `took ${Date.now() - started} ms`);
  assert.deepEqual(JSON.parse(stdout).options, []);
  assert.match(stderr, /T3 gave no model catalogue/);
});
