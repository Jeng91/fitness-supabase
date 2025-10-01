# PowerShell script สำหรับรันแอป React ด้วย port ต่างๆ
param(
    [int]$Port = 3001
)

Write-Host "กำลังรันแอป PJ Fitness บน port $Port..." -ForegroundColor Green

# ตั้งค่า environment variable
$env:PORT = $Port

# รันแอป
npm start