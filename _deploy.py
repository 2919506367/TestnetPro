import paramiko,time,os

hk='64.90.4.219'; hk_pw='ZnEGqMXjIRI8m0XZ'
base='d:/NetDriveFullStackPro'

for a in range(8):
    try:
        s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        s.connect(hk,username='root',password=hk_pw,timeout=30,banner_timeout=30,auth_timeout=30)

        sf=s.open_sftp()
        for f in ['app/api/ai/chat/route.ts','app/ai/page.tsx']:
            sf.put(os.path.join(base,f).replace('\\','/'), f'/root/cloud-drive/{f}')
        sf.close()

        s.exec_command('pm2 delete all 2>/dev/null; pkill -9 -f next-server 2>/dev/null; fuser -k 3000/tcp 2>/dev/null; sleep 3; cd /root/cloud-drive && rm -rf .next && npm run build',timeout=600)
        s.exec_command('cd /root/cloud-drive && pm2 start npm --name cloud-drive -- run start',timeout=15)
        time.sleep(18)

        stdin,stdout,stderr=s.exec_command("curl -sI http://localhost/ | head -1",timeout=10)
        print('OK:', stdout.read().decode().strip())
        s.close()
        break
    except Exception as e:
        if a<7: time.sleep(5)
        else: print(f'FAIL: {e}')
