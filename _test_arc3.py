import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

h = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com'"

# acc/info
cmd = f"curl -s 'https://api.bilibili.com/x/space/acc/info?mid=396848107' {h} | python3 -m json.tool 2>/dev/null | head -50"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
print("acc/info:")
print(stdout.read().decode('utf-8', errors='replace'))

# Check all fields of acc/info for video count
cmd2 = f"curl -s 'https://api.bilibili.com/x/space/acc/info?mid=396848107' {h} | python3 -c 'import sys,json; d=json.load(sys.stdin).get(\"data\",{{}}); print(\"mid:\",d.get(\"mid\")); print(\"name:\",d.get(\"name\")); print(\"video:\",d.get(\"video\")); print(\"videos:\",d.get(\"videos\")); print(\"face:\",d.get(\"face\")); print(\"sign:\",d.get(\"sign\")); print(\"level:\",d.get(\"level\")); print(\"sex:\",d.get(\"sex\"))' 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=15)
print("\nacc/info fields:")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
