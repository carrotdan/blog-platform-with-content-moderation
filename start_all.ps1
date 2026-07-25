# start_all.ps1
# Script khởi động toàn bộ hệ thống: Python AI Service + Node.js Backend + Next.js Frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BLOG PLATFORM - KHOI DONG HE THONG   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Khởi động Python AI Service
Write-Host "[1/3] Dang khoi dong Python AI Service (XLM-Roberta)..." -ForegroundColor Yellow
$aiProcess = Start-Process -PassThru -FilePath "python" `
    -ArgumentList "$root\ai_service\main.py" `
    -WorkingDirectory "$root\ai_service" `
    -WindowStyle Normal

Write-Host "  -> Python AI Service dang chay (PID: $($aiProcess.Id)) tai http://localhost:8000" -ForegroundColor Green
Write-Host "  -> Cho model tai xong (co the mat 30-60 giay)..." -ForegroundColor Gray
Write-Host ""

# 2. Khởi động Node.js Backend
Write-Host "[2/3] Dang khoi dong Node.js Backend..." -ForegroundColor Yellow
$backendProcess = Start-Process -PassThru -FilePath "cmd" `
    -ArgumentList "/c", "cd /d `"$root`" && npm run dev" `
    -WorkingDirectory "$root" `
    -WindowStyle Normal

Write-Host "  -> Backend dang chay (PID: $($backendProcess.Id)) tai http://localhost:5000" -ForegroundColor Green
Write-Host ""

# 3. Khởi động Next.js Frontend
Write-Host "[3/3] Dang khoi dong Next.js Frontend..." -ForegroundColor Yellow
$frontendProcess = Start-Process -PassThru -FilePath "cmd" `
    -ArgumentList "/c", "cd /d `"$root\frontend`" && npm run dev" `
    -WorkingDirectory "$root\frontend" `
    -WindowStyle Normal

Write-Host "  -> Frontend dang chay (PID: $($frontendProcess.Id)) tai http://localhost:3000" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TAT CA SERVICES DA DUOC KHOI DONG!   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend   : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend    : http://localhost:5000" -ForegroundColor White
Write-Host "  AI Service : http://localhost:8000" -ForegroundColor White
Write-Host "  AI Health  : http://localhost:8000/health" -ForegroundColor White
Write-Host "  AI Docs    : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Nhan Enter de dung tat ca services..." -ForegroundColor Red

Read-Host

# Dừng tất cả
Write-Host "Dang dung tat ca services..." -ForegroundColor Yellow
Stop-Process -Id $aiProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "Da dung tat ca services." -ForegroundColor Green
