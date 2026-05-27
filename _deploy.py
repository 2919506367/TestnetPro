import paramiko,time,os

hk='64.90.4.219'; pw='ZnEGqMXjIRI8m0XZ'
base='d:/NetDriveFullStackPro'
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(hk,username='root',password=pw,timeout=25,banner_timeout=25,auth_timeout=25)

# Verify admin restored - write SQL to file
sql = "SELECT id, email, role FROM \"User\" WHERE email = 'ndqxwks16979@163.com';"
with s.open_sftp().file('/tmp/check.sql','w') as f: f.write(sql)
stdin,stdout,stderr=s.exec_command("PGPASSWORD=cloud12345 psql -U postgres -d clouddrive -f /tmp/check.sql 2>&1",timeout=5)
print('VERIFY:', stdout.read().decode().strip())

# Deploy code fix
sf=s.open_sftp()
sf.put(os.path.join(base,'app/api/user/cdk-redeem/route.ts').replace('\\','/'), '/root/cloud-drive/app/api/user/cdk-redeem/route.ts')
sf.close()

s.exec_command('pm2 delete all 2>/dev/null; pkill -9 -f next 2>/dev/null; sleep 2; cd /root/cloud-drive && rm -rf .next && nohup npm run build > /tmp/build.log 2>&1 &',timeout=10)
s.close()
print('Build started...')

for a in range(10):
    time.sleep(15)
    try:
        s2=paramiko.SSHClient(); s2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        s2.connect(hk,username='root',password=pw,timeout=15,banner_timeout=15,auth_timeout=15)
        stdin,stdout,stderr=s2.exec_command('ls /root/cloud-drive/.next/BUILD_ID 2>/dev/null && echo OK || echo WAIT',timeout=5)
        r=stdout.read().decode().strip()
        print(f'[{a}]', r[-30:])
        if 'OK' in r:
            s2.exec_command('cd /root/cloud-drive && pm2 start npm --name cloud-drive -- run start',timeout=10)
            time.sleep(12)
            stdin,stdout,stderr=s2.exec_command('curl -sI http://localhost/ | head -1',timeout=8)
            print('WEB:', stdout.read().decode().strip())
            s2.close()
            break
        s2.close()
    except Exception as e: print(f'[{a}] err:', str(e)[:30])
