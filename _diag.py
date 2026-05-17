import paramiko
pw='Zholv155156.'
h='106.14.126.214'
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(h,username='root',password=pw,timeout=60)

# Check build status
stdin,stdout,stderr=s.exec_command('cat /root/cloud-drive/next.config.ts',timeout=5)
print("next.config.ts:")
print(stdout.read().decode())

# Check proxy.ts
stdin,stdout,stderr=s.exec_command('cat /root/cloud-drive/proxy.ts',timeout=5)
print("\nproxy.ts:")
print(stdout.read().decode('utf-8',errors='replace'))

# Check db.ts
stdin,stdout,stderr=s.exec_command('cat /root/cloud-drive/lib/db.ts',timeout=5)
print("\nlib/db.ts:")
print(stdout.read().decode())

# Check pm2 logs
stdin,stdout,stderr=s.exec_command('pm2 logs cloud-drive --lines 30 --nostream 2>&1 | tail -30',timeout=10)
print("\nPM2 logs:")
print(stdout.read().decode('utf-8',errors='replace'))

# Check if bootstrap.js exists (proxy gets built into standalone output)
stdin,stdout,stderr=s.exec_command('ls -la /root/cloud-drive/.next/server/proxy* 2>/dev/null; ls -la /root/cloud-drive/.next/server/src/proxy* 2>/dev/null',timeout=5)
out=stdout.read().decode()
print("Proxy output:", out if out.strip() else "NOT FOUND")

s.close()
