import https from 'node:https';

const target = process.env.NPM_REGISTRY_CHECK_URL || 'https://registry.npmjs.org/@types%2fnode';

const req = https.get(target, (res) => {
  console.log(`Registry check: ${target}`);
  console.log(`Status: ${res.statusCode}`);

  if ((res.statusCode ?? 500) >= 400) {
    console.error('\nNPM registry is not reachable from current network/proxy policy.');
    console.error('Recommended fix: allowlist host registry.npmjs.org in corporate proxy');
    console.error('or set an internal registry mirror and run: npm config set registry <mirror-url>.');
    process.exit(1);
  }

  console.log('OK: npm registry is reachable.');
});

req.on('error', (err) => {
  console.error(`Registry check failed: ${err.code ?? 'NO_CODE'} ${err.message ?? 'NO_MESSAGE'}`);
  process.exit(1);
});

req.setTimeout(15000, () => {
  req.destroy(new Error('Timeout while checking npm registry connectivity'));
});
