# Helix-Ware ERP — şifreli yedekten geri yükleme (Windows).
# ERP klasöründe çalıştırın:  powershell -ExecutionPolicy Bypass -File kurulum\geri-yukle.ps1
# Yedek parolası ya da basılı kurtarma kodu gerekir. Çözülmüş döküm diske/host'a çıkmaz:
# şifre çözme ve pg_restore backend container'ında tek akışta yapılır (PowerShell ikili
# veriyi borudan geçirirken bozduğu için de bu şart).

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
# Parolada Türkçe karakter olabilir: container'a giden metin UTF-8 olmalı
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $OutputEncoding

function Invoke-Coz {
  param([Parameter(Mandatory)][string]$Secret, [string[]]$CozArgs, [switch]$OneOff)
  if ($OneOff) {
    $dockerArgs = @('compose', 'run', '--rm', '--no-deps', '-T', '--entrypoint', 'node', 'backend', 'scripts/yedek-coz.js') + $CozArgs
  } else {
    $dockerArgs = @('compose', 'exec', '-T', 'backend', 'node', 'scripts/yedek-coz.js') + $CozArgs
  }
  # Çıktı ekrana gider; fonksiyon yalnız çıkış kodunu döndürür
  $Secret | & docker @dockerArgs | Out-Host
  return $LASTEXITCODE
}

Write-Host 'Yedekler (en yenisi üstte):'
# $null | : docker'ın kullanıcının sonraki girdilerini (stdin) yutmaması için
$liste = @($null | & docker compose exec -T backend node scripts/yedek-coz.js --liste | Where-Object { $_ })
if ($liste.Count -eq 0) { Write-Host 'Hiç yedek bulunamadı.'; exit 1 }
for ($i = 0; $i -lt $liste.Count; $i++) {
  $p = $liste[$i] -split "`t"
  Write-Host ("  {0}) {1}  ({2}, {3})" -f ($i + 1), $p[0], $p[1], $p[2])
}

$secim = Read-Host 'Hangi yedek? [1]'
if (-not $secim) { $secim = 1 }
$idx = [int]$secim - 1
if ($idx -lt 0 -or $idx -ge $liste.Count) { Write-Host 'Geçersiz seçim.'; exit 1 }
$dosya = ($liste[$idx] -split "`t")[0]

$guvenli = Read-Host 'Yedek parolası (ya da kurtarma kodu)' -AsSecureString
$sir = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($guvenli))
if (-not $sir) { Write-Host 'Parola girilmedi; hiçbir şey değiştirilmedi.'; exit 1 }

if ((Invoke-Coz -Secret $sir -CozArgs @($dosya, '--kontrol')) -ne 0) {
  Write-Host 'Yedek açılamadı; hiçbir şey değiştirilmedi.'
  exit 1
}

Write-Host ''
Write-Host "DİKKAT: Mevcut veritabanı '$dosya' içeriğiyle DEĞİŞTİRİLECEK."
Write-Host 'Önce mevcut hâlin şifreli bir güvenlik yedeği alınacak (geri-yukleme-oncesi).'
if ((Read-Host 'Devam etmek için EVET yazın') -cne 'EVET') { Write-Host 'Vazgeçildi.'; exit 1 }

$null | & docker compose exec -T postgres_backup yedekle.sh once geri-yukleme-oncesi | Out-Host
if ($LASTEXITCODE -ne 0) { Write-Host 'Güvenlik yedeği alınamadı; geri yükleme yapılmadı.'; exit 1 }

Write-Host 'Uygulama durduruluyor...'
& docker compose stop frontend backend

$durum = Invoke-Coz -Secret $sir -CozArgs @($dosya, '--geri-yukle') -OneOff
$sir = $null

Write-Host 'Uygulama başlatılıyor...'
& docker compose start backend frontend

if ($durum -ne 0) {
  Write-Host "Geri yükleme BAŞARISIZ (kod $durum). Veritabanı eski hâlinde bırakıldı."
  exit $durum
}
Write-Host "Geri yükleme tamamlandı: $dosya"
