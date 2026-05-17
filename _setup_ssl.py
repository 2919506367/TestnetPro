import paramiko,time,os
pw='b7jkyvUVTcE3PpxY'
h='38.92.9.169'
base='d:/NetDriveFullStackPro'

s=paramiko.SSHClient()
s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(h,username='root',password=pw,timeout=30)

# Write nginx config with HTTPS
nginx_conf = '''
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name beautyfun155156.shop;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name beautyfun155156.shop;

    ssl_certificate /etc/letsencrypt/live/beautyfun155156.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beautyfun155156.shop/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    client_max_body_size 10240M;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
'''

s.exec_command(f'''cat > /etc/nginx/sites-available/default << 'NGINXEOF'
{nginx_conf.strip()}
NGINXEOF''', timeout=5)
print('Config written')

# Test and restart
stdin,stdout,stderr=s.exec_command('nginx -t 2>&1 && systemctl restart nginx && echo "Nginx OK"',timeout=15)
out=stdout.read().decode('utf-8',errors='replace')
err=stderr.read().decode('utf-8',errors='replace')
print('Nginx:',out.strip(), err.strip()[:200] if err.strip() else '')

# Verify HTTP redirect
stdin,stdout,stderr=s.exec_command('curl -sI http://localhost/ -H "Host: beautyfun155156.shop" 2>&1 | head -5',timeout=10)
print('\nHTTP redirect:',stdout.read().decode()[:300])

# Verify HTTPS
stdin,stdout,stderr=s.exec_command('curl -skI https://localhost/ -H "Host: beautyfun155156.shop" 2>&1 | head -5',timeout=10)
print('HTTPS:',stdout.read().decode()[:300])

# Set up auto-renew cron
s.exec_command('(crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * certbot renew --quiet --pre-hook \"systemctl stop nginx\" --post-hook \"systemctl start nginx\"") | crontab -',timeout=5)
print('Cron added for auto-renew')

s.close()
