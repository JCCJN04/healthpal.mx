# ============================================
# Script para configurar el Storage Bucket en Supabase
# ============================================
# Este script copia el SQL al clipboard para facilitar su ejecución
# en el Supabase SQL Editor

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CONFIGURACIÓN DE STORAGE BUCKET PARA DOCUMENTOS        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo SQL
$sqlFile = "Database\SETUP_STORAGE_BUCKET.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ ERROR: No se encontró el archivo $sqlFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Asegúrate de ejecutar este script desde la raíz del proyecto." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Archivo SQL encontrado" -ForegroundColor Green
Write-Host ""

# Leer el contenido del archivo
$sqlContent = Get-Content $sqlFile -Raw

# Copiar al clipboard
try {
    $sqlContent | Set-Clipboard
    Write-Host "📋 Contenido copiado al clipboard!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️  No se pudo copiar al clipboard automáticamente" -ForegroundColor Yellow
    Write-Host ""
}

# Instrucciones
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PASOS PARA CONFIGURAR EL STORAGE BUCKET:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Abre Supabase Dashboard:" -ForegroundColor White
Write-Host "    https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Selecciona tu proyecto" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  Ve a: SQL Editor (en el menú lateral izquierdo)" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Click en 'New Query'" -ForegroundColor White
Write-Host ""
Write-Host "5️⃣  Pega el contenido (Ctrl+V - ya está en tu clipboard)" -ForegroundColor White
Write-Host ""
Write-Host "6️⃣  Click en 'Run' o presiona Ctrl+Enter" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 NOTA: Si el bucket ya existe, verás un mensaje:" -ForegroundColor Yellow
Write-Host "    'duplicate key value violates unique constraint'" -ForegroundColor Gray
Write-Host "    Esto es normal y significa que ya está configurado." -ForegroundColor Gray
Write-Host ""

# Preguntar si quiere abrir el navegador
Write-Host "¿Quieres abrir Supabase Dashboard ahora? (S/N): " -ForegroundColor Cyan -NoNewline
$response = Read-Host

if ($response -eq "S" -or $response -eq "s" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🌐 Abriendo navegador..." -ForegroundColor Green
    Start-Process "https://supabase.com/dashboard"
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN (Después de ejecutar el script SQL):" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Ve a 'Storage' en Supabase Dashboard" -ForegroundColor White
Write-Host "✅ Deberías ver el bucket 'documents'" -ForegroundColor White
Write-Host "✅ Debería decir 'Private' (no público)" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 ¡Listo! Después de ejecutar el SQL, tu página de documentos" -ForegroundColor Green
Write-Host "   estará completamente funcional." -ForegroundColor Green
Write-Host ""
Write-Host "📖 Para más información, lee: DOCUMENTS_PAGE_IMPLEMENTATION.md" -ForegroundColor Cyan
Write-Host ""
