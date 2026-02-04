# Script para generar estructura de proyecto
Write-Host "Creando estructura de proyecto..." -ForegroundColor Green

# Definir la ruta base (actual o especificada)
$basePath = ".\"

# Crear carpetas principales
$folders = @(
    "entities",
    "src\api",
    "src\components\pos",
    "src\components\widget",
    "src\hooks",
    "src\lib"
)

foreach ($folder in $folders) {
    $fullPath = Join-Path -Path $basePath -ChildPath $folder
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "✓ Carpeta creada: $folder" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Carpeta ya existe: $folder" -ForegroundColor Yellow
    }
}

# Crear archivos en entities (sin extensión como se muestra en tu lista)
$entityFiles = @(
    "BankAccount",
    "Business",
    "CashRegisterSession",
    "Category", 
    "Item",
    "PaymentMethod",
    "Sale",
    "SalePayment",
    "SmtpConfig"
)

foreach ($file in $entityFiles) {
    $fullPath = Join-Path -Path $basePath -ChildPath "entities\$file"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "✓ Archivo creado: entities\$file" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Archivo ya existe: entities\$file" -ForegroundColor Yellow
    }
}

# Crear archivos en src/api
$apiFiles = @(
    "base44Client.js"
)

foreach ($file in $apiFiles) {
    $fullPath = Join-Path -Path $basePath -ChildPath "src\api\$file"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "✓ Archivo creado: src\api\$file" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Archivo ya existe: src\api\$file" -ForegroundColor Yellow
    }
}

# Crear archivos en src/components
$componentFiles = @(
    "Widget.jsx",
    "Widget.js",
    "UserNotRegisteredError.jsx"
)

foreach ($file in $componentFiles) {
    $fullPath = Join-Path -Path $basePath -ChildPath "src\components\$file"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "✓ Archivo creado: src\components\$file" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Archivo ya existe: src\components\$file" -ForegroundColor Yellow
    }
}

# Crear archivos en src/hooks
$hookFiles = @(
    "use mobile.jsx"
)

foreach ($file in $hookFiles) {
    $fullPath = Join-Path -Path $basePath -ChildPath "src\hooks\$file"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "✓ Archivo creado: src\hooks\$file" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Archivo ya existe: src\hooks\$file" -ForegroundColor Yellow
    }
}

# Crear archivos en src/lib
$libFiles = @(
    "app.params.js",
    "AuthContext.jsx",
    "NavigationTracker.jsx",
    "PageNotFound.jsx",
    "query client.js",
    "utils.js"
)

foreach ($file in $libFiles) {
    $fullPath = Join-Path -Path $basePath -ChildPath "src\lib\$file"
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType File -Path $fullPath -Force | Out-Null
        Write-Host "✓ Archivo creado: src\lib\$file" -ForegroundColor Cyan
    } else {
        Write-Host "✓ Archivo ya existe: src\lib\$file" -ForegroundColor Yellow
    }
}

# Versión alternativa con estructura corregida (comentada)
Write-Host "`n---" -ForegroundColor Gray
Write-Host "OPCIONAL: Versión con estructura corregida" -ForegroundColor Gray
Write-Host "Para usar la versión con nombres corregidos, descomenta la sección 'ESTRUCTURA CORREGIDA'" -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

<#
# ESTRUCTURA CORREGIDA (descomenta si prefieres esta versión)

# Corregir nombre del hook (quitar espacio)
$corregidoPath = Join-Path -Path $basePath -ChildPath "src\hooks\useMobile.jsx"
if (-not (Test-Path $corregidoPath)) {
    New-Item -ItemType File -Path $corregidoPath -Force | Out-Null
    Write-Host "✓ Archivo corregido creado: src\hooks\useMobile.jsx" -ForegroundColor Green
}

# Corregir nombre query client
$corregidoPath = Join-Path -Path $basePath -ChildPath "src\lib\queryClient.js"
if (-not (Test-Path $corregidoPath)) {
    New-Item -ItemType File -Path $corregidoPath -Force | Out-Null
    Write-Host "✓ Archivo corregido creado: src\lib\queryClient.js" -ForegroundColor Green
}
#>

Write-Host "`n¡Estructura creada exitosamente!" -ForegroundColor Green
Write-Host "Total de carpetas creadas: $($folders.Count)" -ForegroundColor White
Write-Host "Total de archivos creados: $($entityFiles.Count + $apiFiles.Count + $componentFiles.Count + $hookFiles.Count + $libFiles.Count)" -ForegroundColor White
Write-Host "`nUbicación: $((Get-Item $basePath).FullName)" -ForegroundColor White