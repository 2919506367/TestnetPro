import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

# Test user info fields
headers = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com/389684998' -H 'Origin: https://space.bilibili.com'"
cmd = f"curl -s 'https://api.bilibili.com/x/space/acc/info?mid=389684998' {headers} | python3 -m json.tool 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
print("B站 acc/info:")
print(stdout.read().decode('utf-8', errors='replace'))

# Test user stat
cmd2 = f"curl -s 'https://api.bilibili.com/x/relation/stat?vmid=389684998' {headers} | python3 -m json.tool 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=15)
print("\nB站 relation/stat:")
print(stdout.read().decode('utf-8', errors='replace'))

# Test arc/search
cmd3 = f"curl -s 'https://api.bilibili.com/x/space/arc/search?mid=389684998&pn=1&ps=6&order=pubdate' {headers} | python3 -m json.tool 2>/dev/null | head -30"
stdin, stdout, stderr = ssh.exec_command(cmd3, timeout=15)
print("\nB站 arc/search:")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
