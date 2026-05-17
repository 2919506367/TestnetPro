import paramiko,time,os
pw_hk='b7jkyvUVTcE3PpxY'
base='d:/NetDriveFullStackPro'

print('=== Sync auth fix to HK ===')
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('38.92.9.169',username='root',password=pw_hk,timeout=30)

sf=s.open_sftp()
sf.put(os.path.join(base,'lib/auth.ts').replace('\\','/'),'/root/cloud-drive/lib/auth.ts')
sf.close()
print('auth.ts synced')

# Also sync drive page for spinner fix
sf=s.open_sftp()
sf.put(os.path.join(base,'app/drive/page.tsx').replace('\\','/'),'/root/cloud-drive/app/drive/page.tsx')
sf.put(os.path.join(base,'app/api/drive/folders/route.ts').replace('\\','/'),'/root/cloud-drive/app/api/drive/folders/route.ts')
sf.put(os.path.join(base,'app/api/drive/files/route.ts').replace('\\','/'),'/root/cloud-drive/app/api/drive/files/route.ts')
sf.put(os.path.join(base,'app/api/auth/me/route.ts').replace('\\','/'),'/root/cloud-drive/app/api/auth/me/route.ts')
sf.close()
print('All files synced')

# Rebuild HK
s.exec_command('pkill -9 -f "next build"; fuser -k 3000/tcp 2>/dev/null; sleep 2',timeout=10)
stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1 | tail -5',timeout=300)
print('Build:',stdout.read().decode().strip())

s.exec_command('cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
time.sleep(6)

for r in ['/','/drive','/bilibili']:
    stdin,stdout,stderr=s.exec_command(f'curl -so /dev/null -w "%{{http_code}}" http://localhost:3000{r}',timeout=10)
    print(f'HK {r}:',stdout.read().decode().strip())

s.close()

# Commit
print('\nDone!')
