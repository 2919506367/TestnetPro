import paramiko, json
password = 'Zholv155156.'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('38.54.85.8', username='root', password=password, timeout=60)

h = "-H 'User-Agent: Mozilla/5.0' -H 'Referer: https://space.bilibili.com'"

cmd = f"curl -s 'https://api.bilibili.com/x/v2/medialist/resource/list?type=1&biz_id=396848107&ps=1' {h}"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
raw = stdout.read().decode('utf-8', errors='replace')
d = json.loads(raw)
item = d['data']['media_list'][0]
# Print all top-level keys
print("Top keys:", list(item.keys()))
# Print key fields
for k in ['id', 'title', 'bvid', 'upper', 'cover', 'duration', 'intro', 'pubtime', 'ctime', 'aid', 'short_link']:
    print(f"  {k}: {json.dumps(item.get(k), ensure_ascii=False)[:150]}")

# Also check has_more / total
print(f"\nhas_more: {d['data'].get('has_more')}")
print(f"total: {d['data'].get('total_count')}")

ssh.close()
