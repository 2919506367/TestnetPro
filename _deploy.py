import paramiko,time,os
base='d:/NetDriveFullStackPro'
files=['lib/bilibili.ts','app/bilibili/components/VideoGrid.tsx','app/bilibili/components/DanmakuLayer.tsx','app/bilibili/components/VideoPlayerModal.tsx','app/bilibili/page.tsx','app/shorts/page.tsx','app/api/bili/search/route.ts','app/api/bili/user/[mid]/videos/route.ts']

for name,h,pw in [('HK','38.92.9.169','b7jkyvUVTcE3PpxY'),('CN','106.14.126.214','Zholv155156.')]:
    for a in range(10):
        try:
            s=paramiko.SSHClient()
            s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            s.connect(h,username='root',password=pw,timeout=10)
            print(f'{name}: connected')
            s.exec_command('mkdir -p /root/cloud-drive/app/api/bili/user/\[mid\]/videos',timeout=5)
            sf=s.open_sftp()
            for f in files:
                sf.put(os.path.join(base,f).replace('\\','/'),f'/root/cloud-drive/{f}')
            sf.close()
            s.exec_command('fuser -k 3000/tcp 2>/dev/null; sleep 1; rm -rf /root/cloud-drive/.next',timeout=10)
            stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm run build 2>&1',timeout=600)
            out=stdout.read().decode('utf-8',errors='replace')
            s.exec_command('cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
            time.sleep(6)
            stdin,stdout,stderr=s.exec_command('curl -so /dev/null -w "%{http_code}" http://localhost:3000/bilibili',timeout=10)
            print(f'{name}: {stdout.read().decode().strip()}')
            s.close()
            break
        except Exception as e:
            if a<9: time.sleep(3)
            else: print(f'{name} FAIL: {e}')
print('Done')
