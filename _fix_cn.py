import paramiko,time
pw='Zholv155156.'
h='106.14.126.214'
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(h,username='root',password=pw,timeout=30)

# Check error log
stdin,stdout,stderr=s.exec_command('cat /root/.pm2/logs/cloud-drive-error.log 2>/dev/null | tail -10',timeout=5)
print('Error log:')
print(stdout.read().decode('utf-8',errors='replace')[:500])

# Check out log
stdin,stdout,stderr=s.exec_command('cat /root/.pm2/logs/cloud-drive-out.log 2>/dev/null | tail -10',timeout=5)
print('\nOut log:')
print(stdout.read().decode('utf-8',errors='replace')[:500])

# Fix: start with the previous working command
s.exec_command('fuser -k 3000/tcp 2>/dev/null; sleep 2',timeout=10)
s.exec_command('pm2 delete cloud-drive 2>/dev/null',timeout=5)
time.sleep(2)
s.exec_command('cd /root/cloud-drive && pm2 start node_modules/.bin/next --name cloud-drive -- start -p 3000',timeout=15)
time.sleep(8)

for route in ['/','/drive','/bilibili','/api/auth/me']:
    stdin,stdout,stderr=s.exec_command(f'curl -so /dev/null -w "%{{http_code}}" http://localhost:3000{route}',timeout=15)
    print(f'{route}: HTTP {stdout.read().decode().strip()}')

stdin,stdout,stderr=s.exec_command('pm2 list 2>&1 | grep cloud-drive',timeout=5)
print('PM2:',stdout.read().decode().strip()[:150])

s.close()
