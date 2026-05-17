import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

headers = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com' -H 'Origin: https://space.bilibili.com'"

# Full medialist response for 2 items
cmd = f"curl -s 'https://api.bilibili.com/x/v2/medialist/resource/list?type=1&biz_id=396848107&ps=2' {headers} | python3 -m json.tool 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
print("medialist:")
print(stdout.read().decode('utf-8', errors='replace'))

# Also check if acc/info returns but with correct field name
# Try getting user info with a different field
cmd2 = f"curl -s 'https://api.bilibili.com/x/space/acc/info?mid=396848107' {headers} | python3 -c \"import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('data',{}), indent=2, ensure_ascii=False))\" 2>/dev/null | head -50"
stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=15)
print("\nacc/info data:")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
