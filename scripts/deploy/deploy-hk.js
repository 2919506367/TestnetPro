const { Client } = require('ssh2');

const server = {
  name: 'HK',
  host: '64.90.4.219',
  port: 22,
  username: 'root',
  password: 'ZnEGqMXjIRI8m0XZ'
};

const deployCmd = `cd /root/cloud-drive && git checkout -- . && git clean -fd && git pull origin main && npm install && npm run build && pm2 delete cloud-drive 2>/dev/null; pm2 start 'npm run start' --name cloud-drive && pm2 save && echo '=== HK Deploy OK ==='`;

console.log(`Deploying to ${server.name} (${server.host})...`);

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected, executing deploy...');
  conn.exec(deployCmd, { pty: true }, (err, stream) => {
    if (err) {
      console.log('Exec error:', err.message);
      conn.end();
      process.exit(1);
    }
    stream.on('close', (code) => {
      console.log(`Exit code: ${code}`);
      conn.end();
      process.exit(code);
    });
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
});

conn.on('error', (err) => {
  console.log('Connection error:', err.message);
  process.exit(1);
});

conn.connect({
  host: server.host,
  port: server.port,
  username: server.username,
  password: server.password,
  readyTimeout: 10000,
  tryKeyboard: true
});