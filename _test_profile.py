import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

# Test user profile
stdin, stdout, stderr = ssh.exec_command("curl -s 'http://localhost:3000/api/bili/user/389684998' | head -c 400", timeout=15)
print("User profile:", stdout.read().decode('utf-8', errors='replace'))

# Test user videos
stdin, stdout, stderr = ssh.exec_command("curl -s 'http://localhost:3000/api/bili/user/389684998/videos' | head -c 400", timeout=15)
print("\nUser videos:", stdout.read().decode('utf-8', errors='replace'))

# Direct B站 user info API
headers = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com/389684998' -H 'Origin: https://space.bilibili.com'"
stdin, stdout, stderr = ssh.exec_command(f"curl -s 'https://api.bilibili.com/x/space/acc/info?mid=389684998' {headers} | head -c 500", timeout=15)
print("\nB站 acc/info:", stdout.read().decode('utf-8', errors='replace'))

# Direct B站 arc/search
stdin, stdout, stderr = ssh.exec_command(f"curl -s 'https://api.bilibili.com/x/space/arc/search?mid=389684998&pn=1&ps=6&order=pubdate' {headers} | head -c 500", timeout=15)
print("\nB站 arc/search:", stdout.read().decode('utf-8', errors='replace'))

ssh.close()
