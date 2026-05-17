import paramiko,json
pw='Zholv155156.'
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('106.14.126.214',username='root',password=pw,timeout=30)

# Check actual running config
cmds = [
    'ss -tlnp | grep 3000',
    'pm2 list 2>&1',
    'grep "start" /root/cloud-drive/package.json',
    'ls /root/cloud-drive/.next/BUILD_ID 2>/dev/null && cat /root/cloud-drive/.next/BUILD_ID || echo "no build"',
    'cat /root/cloud-drive/app/api/auth/me/route.ts',
]
for cmd in cmds:
    stdin,stdout,stderr = s.exec_command(cmd, timeout=10)
    print(f'--- {cmd[:60]} ---')
    print(stdout.read().decode('utf-8',errors='replace')[:500])
    print()

s.close()
