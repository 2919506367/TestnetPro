import paramiko

s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('38.92.9.169',username='root',password='b7jkyvUVTcE3PpxY',timeout=30)

login = """curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"fix_test@test.com","password":"test123"}'"""
stdin,stdout,stderr=s.exec_command(login,timeout=10)
print('HK Login:',stdout.read().decode()[:200])

s.close()

s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect('106.14.126.214',username='root',password='Zholv155156.',timeout=30)

stdin,stdout,stderr=s.exec_command(login,timeout=10)
print('CN Login:',stdout.read().decode()[:200])

stdin,stdout,stderr=s.exec_command('tail -3 /root/.pm2/logs/cloud-drive-error.log 2>/dev/null',timeout=5)
print('CN err:',stdout.read().decode()[:200])

s.close()
