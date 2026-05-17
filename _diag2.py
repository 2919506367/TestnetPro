import paramiko
pw='Zholv155156.'
h='106.14.126.214'
s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(h,username='root',password=pw,timeout=60)

# Test connectivity to HK PostgreSQL
stdin,stdout,stderr=s.exec_command('timeout 5 bash -c "echo >/dev/tcp/38.54.85.8/5432" 2>&1 && echo "OK" || echo "FAIL"',timeout=10)
print("PG port:",stdout.read().decode().strip())

# Check pg package installed
stdin,stdout,stderr=s.exec_command('cd /root/cloud-drive && npm ls pg 2>&1 | head -5',timeout=10)
print("\npg package:",stdout.read().decode())

# Check DBURL
stdin,stdout,stderr=s.exec_command('grep DATABASE_URL /root/cloud-drive/.env',timeout=5)
print("\nDB URL:",stdout.read().decode()[:200])

# Check pm2 status
stdin,stdout,stderr=s.exec_command('pm2 show cloud-drive 2>&1 | head -20',timeout=5)
print("\nPM2:",stdout.read().decode('utf-8',errors='replace')[:500])

s.close()
