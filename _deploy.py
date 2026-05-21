import paramiko,time,os

hk='64.90.4.219'; hk_pw='ZnEGqMXjIRI8m0XZ'
ali='106.14.126.214'; ali_pw='Zholv155156.'

# Check what's running on HK
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(hk,username='root',password=hk_pw,timeout=30,banner_timeout=30,auth_timeout=30)

stdin,stdout,stderr=s.exec_command("""
echo '=== FEED ==='
curl -s 'http://localhost/api/bili/feed?seed=99&size=2' | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('videos',[])),'videos, source:',d.get('source','?'))"
echo '=== HOME ==='
curl -sI http://localhost/ | head -1
echo '=== PM2 ==='
pm2 list 2>/dev/null | grep cloud
echo '=== RELAY ==='
cat /root/cloud-drive/.env | grep RELAY
echo '=== COOKIE ==='
cat /root/cloud-drive/.env | grep COOKIE | head -c 40
""",timeout=15)
print(stdout.read().decode().strip())
s.close()
