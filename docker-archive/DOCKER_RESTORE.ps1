# Docker Yapılandırmasını Geri Yükleme Script'i
# Kullanım: .\DOCKER_RESTORE.ps1

Write-Host "=== Docker Yapılandırması Geri Yükleniyor ===" -ForegroundColor Cyan
Write-Host ""

# Proje root dizinini bul
$projectRoot = Split-Path -Parent $PSScriptRoot

# Devops klasörünü geri yükle
if (Test-Path "$PSScriptRoot\devops") {
    Write-Host "✓ devops klasörü bulundu" -ForegroundColor Green
    
    if (Test-Path "$projectRoot\devops") {
        Write-Host "⚠ devops klasörü zaten mevcut!" -ForegroundColor Yellow
        $confirm = Read-Host "Üzerine yazmak istiyor musunuz? (Y/N)"
        if ($confirm -ne "Y" -and $confirm -ne "y") {
            Write-Host "İşlem iptal edildi." -ForegroundColor Red
            exit
        }
        Remove-Item "$projectRoot\devops" -Recurse -Force
    }
    
    Move-Item -Path "$PSScriptRoot\devops" -Destination "$projectRoot\devops" -Force
    Write-Host "✓ devops klasörü geri yüklendi" -ForegroundColor Green
} else {
    Write-Host "✗ devops klasörü bulunamadı!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Sonraki Adımlar ===" -ForegroundColor Yellow
Write-Host "1. Docker Desktop'ı başlatın"
Write-Host "2. cd devops"
Write-Host "3. docker-compose up -d"
Write-Host "4. Backend .env dosyasını Docker için güncelleyin:"
Write-Host "   DB_HOST=postgres"
Write-Host "   REDIS_URL=redis://redis:6379"
Write-Host "5. cd backend && npm run migrate"
Write-Host "6. npm start (backend) ve npm run dev (frontend)"
Write-Host ""
Write-Host "✓ Docker yapılandırması başarıyla geri yüklendi!" -ForegroundColor Green
