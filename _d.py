import paramiko,time,os
base='d:/NetDriveFullStackPro'

for attempt in range(10):
    try:
        s=paramiko.SSHClient()
        s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        s.connect('38.92.9.169',username='root',password='b7jkyvUVTcE3PpxY',timeout=10)
        print('HK connected')

        sf=s.open_sftp()
        for f in ['app/api/auth/send-verify-code/route.ts','app/api/auth/register/route.ts']:
            sf.put(os.path.join(base,f).replace('\\','/'),f'/root/cloud-drive/{f}')
        sf.close()
        print('Files synced')

        # Kill separately - don't kill SSH port
        s.exec_command('pkill -f "next start" || true; sleep 2',timeout=10)
        s.exec_command('rm -rf /root/cloud-drive/.next',timeout=10)
        print('Cleaned')

        # Just build using exec_command with longer timeout
        stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1',timeout=600)
        out=stdout.read().decode('utf-8',errors='replace')
        print('Build output:',out[-500:] if len(out)>500 else out)

        stdin2,stdout2,stderr2=s.exec_command('ls /root/cloud-drive/.next/BUILD_ID 2>/dev/null && echo OK || echo FAIL',timeout=5)
        has=stdout2.read().decode().strip()
        print('Build result:',has)

        if 'OK' in has:
            s.exec_command('cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
            time.sleep(8)
            
            stdin,stdout,stderr=s.exec_command(
                "curl -s -X POST http://localhost:3000/api/auth/send-verify-code "
                "-H 'Content-Type: application/json' "
                "-d '{\"email\":\"test_diag2@test.com\"}'",
                timeout=15
            )
            print('Send code:',stdout.read().decode()[:200])

            stdin,stdout,stderr=s.exec_command('tail -3 /root/.pm2/logs/cloud-drive-out.log',timeout=5)
            print('Log:',stdout.read().decode()[-200:])

        s.close()
        break
    except Exception as e:
        if attempt<9: time.sleep(3)
        else: print('FAIL:',e)
