import paramiko,time,os
pw_hk='b7jkyvUVTcE3PpxY'
pw_cn='Zholv155156.'
base='d:/NetDriveFullStackPro'

# 1. Fix HK PostgreSQL password to match CN
print('=== Fix HK PG user password ===')
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('38.92.9.169',username='root',password=pw_hk,timeout=30)

# Recreate user with correct password
stdin,stdout,stderr=s.exec_command(
    """su - postgres -c "psql -c \\"ALTER USER clouddrive WITH PASSWORD 'CloudDrive2025Sync';\\"" 2>&1""",
    timeout=10
)
print('PG user:',stdout.read().decode().strip())

# Update HK .env to match (just in case)
s.exec_command(
    'sed -i "s|DATABASE_URL=.*|DATABASE_URL=\\"postgresql://clouddrive:CloudDrive2025Sync@127.0.0.1:5432/clouddrive\\"|" /root/cloud-drive/.env',
    timeout=5
)
stdin,stdout,stderr=s.exec_command('grep DATABASE_URL /root/cloud-drive/.env',timeout=5)
print('HK DB URL:',stdout.read().decode().strip())

# Restart HK
s.exec_command('fuser -k 3000/tcp 2>/dev/null; sleep 1',timeout=10)
s.exec_command('cd /root/cloud-drive && pm2 delete cloud-drive 2>/dev/null; sleep 1; pm2 start "npm run start" --name cloud-drive',timeout=15)
time.sleep(6)

# Verify HK
stdin,stdout,stderr=s.exec_command('curl -so /dev/null -w "%{http_code}" http://localhost:3000/',timeout=10)
print('HK /:',stdout.read().decode().strip())

s.close()

# 2. Deploy auth fix + rebuild CN
print('\n=== Deploy CN ===')
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('106.14.126.214',username='root',password=pw_cn,timeout=30)

# Sync auth.ts
sf=s.open_sftp()
sf.put(os.path.join(base,'lib/auth.ts').replace('\\','/'),'/root/cloud-drive/lib/auth.ts')
sf.close()
print('auth.ts synced')

# Test DB connection from CN
stdin,stdout,stderr=s.exec_command(
    'cd /root/cloud-drive && timeout 3 bash -c "echo >/dev/tcp/38.92.9.169/5432" 2>&1 && echo REACHABLE || echo BLOCKED',
    timeout=10
)
print('CN->HK PG:',stdout.read().decode().strip())

# Rebuild
s.exec_command('pkill -9 -f "next build"; pkill -9 -f "next start"; fuser -k 3000/tcp 2>/dev/null; sleep 3',timeout=10)
stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1 | tail -5',timeout=600)
print('Build:',stdout.read().decode().strip())

s.exec_command('fuser -k 3000/tcp 2>/dev/null; pm2 delete cloud-drive 2>/dev/null; sleep 1; cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
time.sleep(8)

# Verify CN
for r in ['/','/api/auth/login']:
    stdin,stdout,stderr=s.exec_command(f'curl -so /dev/null -w "%{{http_code}}" http://localhost:3000{r}',timeout=10)
    print(f'CN {r}:',stdout.read().decode().strip())

# Test actual login
stdin,stdout,stderr=s.exec_command(
    """curl -s -X POST http://localhost:3000/api/auth/register """
    """-H 'Content-Type: application/json' """
    """-d '{"email":"fix_test@test.com","password":"test123","nickname":"fixtest"}' 2>&1 | head -c 200""",
    timeout=15
)
print('CN Register test:',stdout.read().decode()[:200])

s.close()
print('\nDone!')
