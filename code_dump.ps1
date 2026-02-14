# Configuración de extensiones a incluir (puedes agregar más)
 $extensions = @("*.js", "*.ts", "*.jsx", "*.tsx", "*.py", "*.java", "*.cs", "*.go", "*.rb", "*.php", "*.html", "*.css", "*.scss", "*.json", "*.yaml", "*.yml", "*.md", "*.sql", "*.sh", "*.ps1", "*.txt")

# Carpetas a ignorar (agrega aquí las que quieras excluir)
 $excludeDirs = @("node_modules", ".git", "venv", "env", "__pycache__", "bin", "obj", "dist", "build", ".idea", ".vscode", "vendor")

# Archivo de salida
 $outputFile = "repo_dump.txt"

# Limpiar archivo anterior si existe
if (Test-Path $outputFile) { Remove-Item $outputFile }

Write-Host "Escaneando archivos..." -ForegroundColor Cyan

Get-ChildItem -Recurse -File | Where-Object {
    # Filtrar por extensión
    $extMatch = $extensions | Where-Object { $_.Name -like $_ }
    
    # Filtrar carpetas excluidas
    $dirMatch = $excludeDirs | Where-Object { $_.FullName -like "*\$_\*" }
    
    # Incluir solo si coincide la extensión y NO está en carpeta excluida
    ($extMatch) -and (-not $dirMatch)
} | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path, ".")
    
    # Formato claro para el LLM
    Add-Content -Path $outputFile -Value "--- INICIO ARCHIVO: $relativePath ---"
    
    # Intentar leer como texto (omite binarios automáticamente si da error)
    try {
        $content = Get-Content $_.FullName -Raw -ErrorAction Stop
        Add-Content -Path $outputFile -Value $content
    }
    catch {
        Add-Content -Path $outputFile -Value "[CONTENIDO BINARIO OMITIDO]"
    }
    
    Add-Content -Path $outputFile -Value "--- FIN ARCHIVO: $relativePath ---`n"
    Write-Host "Procesado: $relativePath" -ForegroundColor Gray
}

Write-Host "`n¡Listo! El código está en '$outputFile'" -ForegroundColor Green
Write-Host "Copia el contenido de ese archivo y pégalo aquí." -ForegroundColor Yellow