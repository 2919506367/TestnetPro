import paramiko,time,os
pw_hk='b7jkyvUVTcE3PpxY'
pw_cn='Zholv155156.'
base='d:/NetDriveFullStackPro'

for name,h,pw in [('HK','38.92.9.169',pw_hk),('CN','106.14.126.214',pw_cn)]:
    print(f'=== {name} ===')
    s=paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect(h,username='root',password=pw,timeout=30)
    sf=s.open_sftp()
    sf.put(os.path.join(base,'app/api/bili/feed/route.ts').replace('\\','/'),'/root/cloud-drive/app/api/bili/feed/route.ts')
    sf.close()
    s.exec_command('fuser -k 3000/tcp 2>/dev/null; sleep 1',timeout=10)
    s.exec_command('rm -rf /root/cloud-drive/.next',timeout=10)
    transport=s.get_transport()
    channel=transport.open_session()
    channel.exec_command('cd /root/cloud-drive && npm run build 2>&1')
    while not channel.exit_status_ready():
        if channel.recv_ready(): channel.recv(4096)
        if channel.recv_stderr_ready(): channel.recv_stderr(4096)
        time.sleep(1)
    time.sleep(2)
    if channel.recv_ready(): channel.recv(4096)
    channel.close()
    s.exec_command('cd /root/cloud-drive && pm2 start "npm run start" --name cloud-drive',timeout=15)
    time.sleep(8)
    stdin,stdout,stderr=s.exec_command('curl -so /dev/null -w "%{http_code}" http://localhost:3000/shorts',timeout=10)
    print(f'  shorts: HTTP {stdout.read().decode().strip()}')
    s.close()
print('Done')
