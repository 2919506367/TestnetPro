import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

headers = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com' -H 'Origin: https://space.bilibili.com'"

# Try wbi version of arc/search
for ep in [
    '/x/space/wbi/arc/search?mid=396848107&pn=1&ps=3&order=pubdate',
    '/x/v2/medialist/resource/list?type=1&biz_id=396848107&ps=3',
]:
    cmd = f"curl -s 'https://api.bilibili.com{ep}' {headers} | head -c 400"
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    print(f"\n{ep}:")
    print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
