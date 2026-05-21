import paramiko

hk='64.90.4.219'; hk_pw='ZnEGqMXjIRI8m0XZ'
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(hk,username='root',password=hk_pw,timeout=30,banner_timeout=30,auth_timeout=30)

js="""var h='http://106.14.126.214:3001'; var ck='buvid3=BE2E84CE-C7F2-D9FA-4F28-BFDBE6640BD840825infoc; DedeUserID=161049576; bili_jct=7dd310d004fd4acf890332d3491ed35b; SESSDATA=e4f3891d%2C1794756738%2C41aea%2A52CjDEIZD6cFAGD8NGlL-PyRhAaxeekepj4P-q38-SOpkAKxpjpBZr00xi7uAQAVizn1cSVnRhYTA5ZnRBeDhhbkRHTUNoRHZKT2RZdm5nYUFQSEVuMm9xdWlCWkRnRjdVdS03SnFfYmRvQ2dYU2xzcVAyeW85M08wY1QtMVBFaTQ2UnJfLXdOV2N3IIEC'; fetch(h+'/api',{method:'POST',headers:{'Content-Type':'application/json','x-relay-key':'bili-relay-internal-2026'},body:JSON.stringify({path:'/x/web-interface/wbi/search/type?search_type=video&keyword=bilibili&page=1',cookies:ck})}).then(r=>r.json()).then(d=>console.log('code:',d.body?.code,'results:',d.body?.data?.numResults)).catch(e=>console.log('err:',e.message));"""
with s.open_sftp().file('/tmp/t.js','w') as f: f.write(js)
stdin,stdout,stderr=s.exec_command('node /tmp/t.js 2>&1',timeout=15)
print(stdout.read().decode().strip())
s.close()
