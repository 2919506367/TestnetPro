import paramiko
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

headers = "-H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' -H 'Referer: https://www.bilibili.com' -H 'Origin: https://www.bilibili.com'"

cmd = f"curl -s 'https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=bili_user&keyword=%E6%B5%8B%E8%AF%95&page=1' {headers} | python3 -m json.tool 2>/dev/null | head -100"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
print(stdout.read().decode('utf-8', errors='replace'))
ssh.close()
