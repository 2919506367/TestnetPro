import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

h = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com'"

# Full medialist 1 item to see all fields
cmd = f"curl -s 'https://api.bilibili.com/x/v2/medialist/resource/list?type=1&biz_id=396848107&ps=1' {h} | python3 -m json.tool 2>/dev/null"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
out = stdout.read().decode('utf-8', errors='replace')
print(out[:3000])

ssh.close()
