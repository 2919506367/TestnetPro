param(
    [string]$Password
)

if (-not $Password) {
    $Password = Read-Host "Enter SSH root password" -AsSecureString
} else {
    $securePassword = $Password | ConvertTo-SecureString -AsPlainText -Force
    $Password = $null
    $Password = $securePassword
}

if ($Password -is [System.Security.SecureString]) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
} else {
    $plainPassword = $Password
}

$servers = @(
    @{Name="HK"; Host="38.54.85.8"; Cmd="cd /root/cloud-drive && git pull && npm install && npm run build && pm2 restart cloud-drive && echo '=== HK Deploy OK ==='"},
    @{Name="CN"; Host="106.14.126.214"; Cmd="cd /root/cloud-drive && git pull && npm install && npm run build && pm2 restart cloud-drive && echo '=== CN Deploy OK ==='"}
)

$plinkPath = "C:\Program Files\PuTTY\plink.exe"
if (-not (Test-Path $plinkPath)) {
    $plinkPath = (Get-Command plink -ErrorAction SilentlyContinue).Source
}

if (-not $plinkPath) {
    Write-Host "plink not found, trying ssh..." -ForegroundColor Yellow
    foreach ($s in $servers) {
        Write-Host "Deploying to $($s.Name) ($($s.Host))..." -ForegroundColor Cyan
        echo $plainPassword | ssh -o StrictHostKeyChecking=no root@$($s.Host) $s.Cmd
    }
} else {
    foreach ($s in $servers) {
        Write-Host "Deploying to $($s.Name) ($($s.Host))..." -ForegroundColor Cyan
        echo $plainPassword | & $plinkPath -ssh -pw $plainPassword root@$($s.Host) $s.Cmd
    }
}

Write-Host "Deployment complete!" -ForegroundColor Green
