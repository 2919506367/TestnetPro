import paramiko

for h in ['38.92.9.169','106.14.126.214']:
    pw='b7jkyvUVTcE3PpxY' if '38' in h else 'Zholv155156.'
    try:
        s=paramiko.SSHClient()
        s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        s.connect(h,username='root',password=pw,timeout=10)
        print(f'\n=== {h} ===')
        # Test proxy directly
        cmd = 'curl -s -o /dev/null -w "HTTP:%{http_code} Size:%{size_download} CT:%{content_type}" "http://localhost:3000/api/proxy?url=https://www.baidu.com" 2>&1'
        stdin,stdout,stderr=s.exec_command(cmd,timeout=15)
        print('proxy:',stdout.read().decode().strip())

        # Check if X-Frame-Options is returned
        cmd2 = 'curl -sI "http://localhost:3000/api/proxy?url=https://www.baidu.com" 2>&1 | head -20'
        stdin2,stdout2,stderr2=s.exec_command(cmd2,timeout=15)
        print('headers:',stdout2.read().decode().strip())

        # Check error log
        stdin3,stdout3,stderr3=s.exec_command('tail -20 /root/.pm2/logs/cloud-drive-error.log 2>/dev/null',timeout=5)
        print('err log:',stdout3.read().decode().strip()[-400:])

        s.close()
    except Exception as e:
        print(f'Error: {e}')
