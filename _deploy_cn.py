import paramiko,time,os
pw='Zholv155156.'
base='d:/NetDriveFullStackPro'
h='106.14.126.214'

s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(h,username='root',password=pw,timeout=30)

# Sync modified files
files=['app/api/auth/me/route.ts','server.ts']
sf=s.open_sftp()
for f in files:
    sf.put(os.path.join(base,f).replace('\\','/'),f'/root/cloud-drive/{f}')
    print(f'OK: {f}')
sf.close()

# Kill zombie
s.exec_command('fuser -k 3000/tcp 2>/dev/null; sleep 2',timeout=10)

# Rebuild
stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1 | tail -5',timeout=300)
build=stdout.read().decode('utf-8',errors='replace')
if build.strip(): print('Build:',build.strip())

# Restart with proper server.ts (Socket.io)
s.exec_command('pm2 delete cloud-drive 2>/dev/null',timeout=5)
time.sleep(1)
s.exec_command('cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
time.sleep(8)

# Verify
for route in ['/','/drive','/bilibili','/api/auth/me']:
    stdin,stdout,stderr=s.exec_command(f'curl -so /dev/null -w "%{{http_code}}" http://localhost:3000{route}',timeout=15)
    print(f'{route}: HTTP {stdout.read().decode().strip()}')

# Check PM2
stdin,stdout,stderr=s.exec_command('pm2 list 2>&1 | grep cloud-drive',timeout=5)
print('PM2:',stdout.read().decode().strip()[:150])

s.close()
print('Done')
