import paramiko,time,os

base='d:/NetDriveFullStackPro'
files=['app/api/proxy/route.ts']

for h,pw in [('38.92.9.169','b7jkyvUVTcE3PpxY'),('106.14.126.214','Zholv155156.')]:
    try:
        s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy()); s.connect(h,username='root',password=pw,timeout=10)
        print(f'\n=== {h} ===')
        s.exec_command('pm2 delete cloud-drive 2>/dev/null; fuser -k 3000/tcp 2>/dev/null; rm -rf /root/cloud-drive/.next; sleep 2',timeout=10)
        stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1',timeout=600)
        out=stdout.read().decode()
        ok='Compiled successfully' in out or 'BUILD_ID' in out or '○' in out
        print('Build OK' if ok else 'BUILD FAIL')
        stdin2,stdout2,stderr2=s.exec_command('ls /root/cloud-drive/.next/BUILD_ID && echo OK || echo FAIL',timeout=5)
        r=stdout2.read().decode().strip()
        if 'OK' in r:
            s.exec_command('cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
            time.sleep(10)
            # Use file approach to avoid escaping issues
            s.exec_command("""cat > /tmp/t.sh << 'SHEOF'
#!/bin/bash
echo -n "baidu:"; curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/proxy?url=https://www.baidu.com"
echo -n " bili:"; curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/proxy?url=https://www.bilibili.com"
echo ""
SHEOF
chmod +x /tmp/t.sh""",timeout=5)
            stdin3,stdout3,stderr3=s.exec_command('/tmp/t.sh 2>&1',timeout=15)
            print(stdout3.read().decode().strip())
        s.close()
    except Exception as e: print(f'Error: {e}')
print('Done')
