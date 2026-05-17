import paramiko, urllib.request, json

# === Test domain DNS ===
print("=== DNS Resolution ===")
import socket
try:
    ip = socket.gethostbyname('beautyfun155156.shop')
    print(f'beautyfun155156.shop -> {ip}')
except Exception as e:
    print(f'DNS FAIL: {e}')

# Test direct HTTP to domain
print("\n=== Direct HTTP to domain ===")
for url in ['http://beautyfun155156.shop/', 'http://beautyfun155156.shop/drive']:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10)
        print(f'{url} -> HTTP {resp.getcode()}')
    except Exception as e:
        print(f'{url} -> FAIL: {e}')

# === Test servers directly ===
print("\n=== HK Server Tests ===")
try:
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect('38.92.9.169', username='root', password='b7jkyvUVTcE3PpxY', timeout=30)
    
    # Test login
    stdin, stdout, stderr = s.exec_command(
        '''curl -sv -c /tmp/cookie.txt -X POST http://localhost:3000/api/auth/register '''
        '''-H 'Content-Type: application/json' '''
        '''-d '{"email":"test999@test.com","password":"test123","nickname":"testuser999"}' 2>&1 | head -20''',
        timeout=15
    )
    print('HK Register:', stdout.read().decode()[:200])
    
    stdin, stdout, stderr = s.exec_command(
        '''curl -sv -c /tmp/cookie2.txt -X POST http://localhost:3000/api/auth/login '''
        '''-H 'Content-Type: application/json' '''
        '''-d '{"email":"test999@test.com","password":"test123"}' 2>&1 | head -20''',
        timeout=15
    )
    print('HK Login:', stdout.read().decode()[:200])
    
    # Check cookie setting
    stdin, stdout, stderr = s.exec_command(
        '''curl -sv -c /tmp/cookie3.txt -X POST http://localhost:3000/api/auth/login '''
        '''-H 'Content-Type: application/json' '''
        '''-d '{"email":"test999@test.com","password":"test123"}' 2>&1 | grep -i "set-cookie"''',
        timeout=15
    )
    print('HK Set-Cookie header:', stdout.read().decode()[:200])
    
    s.close()
except Exception as e:
    print(f'HK FAIL: {e}')

print("\n=== CN Server Tests ===")
try:
    s = paramiko.SSHClient()
    s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    s.connect('106.14.126.214', username='root', password='Zholv155156.', timeout=30)
    
    stdin, stdout, stderr = s.exec_command(
        '''curl -sv -X POST http://localhost:3000/api/auth/register '''
        '''-H 'Content-Type: application/json' '''
        '''-d '{"email":"cn_test888@test.com","password":"test123","nickname":"cntest888"}' 2>&1 | tail -15''',
        timeout=15
    )
    print('CN Register:', stdout.read().decode()[:300])
    
    stdin, stdout, stderr = s.exec_command(
        '''curl -sv -X POST http://localhost:3000/api/auth/login '''
        '''-H 'Content-Type: application/json' '''
        '''-d '{"email":"test999@test.com","password":"test123"}' 2>&1 | tail -15''',
        timeout=15
    )
    print('CN Login:', stdout.read().decode()[:300])
    
    # Check pm2 errors
    stdin, stdout, stderr = s.exec_command('tail -10 /root/.pm2/logs/cloud-drive-out.log', timeout=5)
    print('CN out log:', stdout.read().decode()[:200])
    
    stdin, stdout, stderr = s.exec_command('tail -10 /root/.pm2/logs/cloud-drive-error.log', timeout=5)
    print('CN err log:', stdout.read().decode()[:200])
    
    s.close()
except Exception as e:
    print(f'CN FAIL: {e}')
