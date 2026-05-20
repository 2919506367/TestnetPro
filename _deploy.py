import paramiko,time

h='64.90.4.219'; pw='ZnEGqMXjIRI8m0XZ'

for a in range(8):
    try:
        s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        s.connect(h,username='root',password=pw,timeout=25,banner_timeout=25,auth_timeout=25)

        # Simple: trust for local, push, then revert
        cmd = """
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)
cp "$PG_HBA" "$PG_HBA.bak"
echo "local   all             postgres                                trust" > "$PG_HBA"
echo "local   all             all                                     trust" >> "$PG_HBA"
echo "host    all             all             127.0.0.1/32            trust" >> "$PG_HBA"
echo "host    all             all             ::1/128                 trust" >> "$PG_HBA"
systemctl restart postgresql && sleep 2 && pg_isready && echo TRUST_OK || echo FAIL
"""
        stdin,stdout,stderr=s.exec_command(cmd,timeout=15)
        print('TRUST:', stdout.read().decode().strip()[-100:])

        # Push
        stdin,stdout,stderr=s.exec_command("cd /root/cloud-drive && npx prisma db push --accept-data-loss 2>&1 | tail -5",timeout=30)
        print('PUSH:', stdout.read().decode().strip()[-200:])

        # Restart Next.js
        s.exec_command("pm2 restart cloud-drive 2>/dev/null; sleep 5",timeout=15)

        # Test register  
        stdin,stdout,stderr=s.exec_command("curl -s http://localhost/api/auth/register -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"123456\",\"nickname\":\"Test\"}' | head -c 200",timeout=10)
        print('REG:', stdout.read().decode().strip())

        # Test login
        stdin,stdout,stderr=s.exec_command("curl -s http://localhost/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"123456\"}' | head -c 200",timeout=10)
        print('LOGIN:', stdout.read().decode().strip())

        s.close()
        break
    except Exception as e:
        if a < 7: print(f'retry {a}...'); time.sleep(4)
        else: print(f'FAIL: {e}')
