import paramiko, time
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

headers = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com' -H 'Origin: https://space.bilibili.com'"

# Try a different mid
cmd = f"curl -s 'https://api.bilibili.com/x/space/arc/search?mid=396848107&pn=1&ps=6&order=pubdate' {headers} | python3 -m json.tool 2>/dev/null | head -40"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
print("arc/search (fresh mid):")
print(stdout.read().decode('utf-8', errors='replace'))

# Check acc/info field names
cmd2 = f"curl -s 'https://api.bilibili.com/x/space/acc/info?mid=396848107' {headers} | python3 -m json.tool 2>/dev/null | head -40"
stdin, stdout, stderr = ssh.exec_command(cmd2, timeout=15)
print("\nacc/info:")
print(stdout.read().decode('utf-8', errors='replace'))

# Test our API for the user
stdin, stdout, stderr = ssh.exec_command("curl -s 'http://localhost:3000/api/bili/user/396848107/videos' | head -c 500", timeout=15)
print("\nOur user/videos:", stdout.read().decode('utf-8', errors='replace')[:400])

ssh.close()
