// Deliberately small process-boundary fixture. Never contacts a provider.
let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
const mode = process.argv[2];
if (mode === 'signal') process.stdout.write(JSON.stringify({ protocol: 1, ok: false, error: { category: 'transient', message: 'stopping', effects: 'none' } }), () => process.kill(process.pid, 'SIGTERM'));
else if (mode === 'overflow') process.stdout.write('x'.repeat(10000));
else if (mode === 'timeout') setInterval(() => {}, 1000);
else if (mode === 'malformed') process.stdout.write('{');
else {
  process.stdout.write(JSON.stringify({ protocol: mode === 'version' ? 99 : 1, ok: true, result: { valid: true, gaps: [] } }));
  process.exitCode = mode === 'exit' ? 1 : 0;
}
