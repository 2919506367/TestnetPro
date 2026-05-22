import paramiko,time

hk='64.90.4.219'; hk_pw='ZnEGqMXjIRI8m0XZ'
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(hk,username='root',password=hk_pw,timeout=30,banner_timeout=30,auth_timeout=30)

# Fix: update package.json scripts to source .env before starting
pkg_script = """#!/bin/bash
set -a
[ -f .env ] && . .env
[ -f .env.production ] && . .env.production
set +a
exec node node_modules/next/dist/bin/next start
"""
with s.open_sftp().file('/root/cloud-drive/start-next.sh','w') as f: f.write(pkg_script)
s.exec_command('chmod +x /root/cloud-drive/start-next.sh',timeout=5)

s.exec_command('pm2 kill 2>/dev/null; pkill -f next-server 2>/dev/null; sleep 3',timeout=10)

# Build
stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && rm -rf .next && npm run build 2>&1 | tail -3',timeout=600)
print('BUILD:', stdout.read().decode().strip()[-100:])

# Start via wrapper script that sources .env
s.exec_command('cd /root/cloud-drive && pm2 start ./start-next.sh --name cloud-drive',timeout=15)
time.sleep(16)

stdin,stdout,stderr=s.exec_command("curl -s 'http://localhost/api/bili/search?q=bilibili&type=video' 2>&1 | head -c 150",timeout=15)
print('SEARCH:', stdout.read().decode().strip()[:200])

stdin,stdout,stderr=s.exec_command("curl -sI http://localhost/ | head -1",timeout=5)
print('HOME:', stdout.read().decode().strip())
s.close()
