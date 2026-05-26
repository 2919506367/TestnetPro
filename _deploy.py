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

        # VERIFY upload before build
        stdin,stdout,stderr=s.exec_command("grep -c 'reasoning_done' /root/cloud-drive/app/api/ai/chat/route.ts && echo 'UPLOAD_OK' || echo 'UPLOAD_FAIL'",timeout=5)
        v = stdout.read().decode().strip()
        print('VERIFY:', v)
        if 'FAIL' in v:
            print('Upload failed, retry...')
            time.sleep(5)
            continue

        # Kill, clean, rebuild
        s.exec_command('pm2 delete all 2>/dev/null; pkill -9 -f next-server 2>/dev/null; fuser -k 3000/tcp 2>/dev/null; sleep 3',timeout=15)
        s.exec_command('cd /root/cloud-drive && rm -rf .next node_modules/.cache',timeout=10)

        stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1 | tail -3',timeout=600)
        print('BUILD:', stdout.read().decode().strip()[-100:])

        # Verify build timestamp vs source
        stdin,stdout,stderr=s.exec_command("stat -c '%Y' /root/cloud-drive/.next/BUILD_ID; echo -n ' '; stat -c '%Y' /root/cloud-drive/app/api/ai/chat/route.ts",timeout=5)
        ts = stdout.read().decode().strip().split()
        if len(ts) == 2:
            bld, src = int(ts[0]), int(ts[1])
            if bld < src: print('BUILD_TIMESTAMPS_OK: build after source')
            else: print('WARN: build ts', bld, '>= source ts', src)

        s.exec_command('cd /root/cloud-drive && pm2 start npm --name cloud-drive -- run start',timeout=15)
        time.sleep(16)
        stdin,stdout,stderr=s.exec_command("curl -sI http://localhost/ | head -1",timeout=10)
        print('WEB:', stdout.read().decode().strip())
        s.close()
        break
    except Exception as e:
        if a<7: time.sleep(5)
        else: print(f'FAIL: {e}')
