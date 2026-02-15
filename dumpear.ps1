# ============================================
# Script: Dump-CodigoCompleto.ps1
# Descripción: Dumpea todo el código del directorio indicado (te pregunta por el path)
# ============================================

# Preguntar al usuario por el directorio a dumpear (con default ./)
$inputPath = Read-Host "¿Qué directorio quieres dumpear? (deja vacío para usar el actual ./)"
if ([string]::IsNullOrWhiteSpace($inputPath)) {
    $directorioBase = Get-Location
} else {
    # Expandir la ruta relativa o absoluta
    $directorioBase = Resolve-Path $inputPath -ErrorAction Stop
}

$fecha = Get-Date -Format "yyyyMMdd_HHmmss"
$nombreDir = Split-Path -Path $directorioBase -Leaf
if ([string]::IsNullOrWhiteSpace($nombreDir)) { $nombreDir = "root" }
$archivoSalida = "dump_codigo_completo_${nombreDir}_$fecha.txt"

# Extensiones de archivos de código a incluir (puedes modificar esta lista)
$extensionesCodigo = @(
    # Web
    '.html', '.htm', '.css', '.scss', '.sass', '.less', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
    # Backend
    '.php', '.py', '.rb', '.java', '.jsp', '.asp', '.aspx', '.cshtml', '.vbhtml',
    # .NET / C#
    '.cs', '.vb', '.fs', '.fsx', '.fsi',
    # C/C++
    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
    # Mobile
    '.swift', '.m', '.mm', '.kt', '.kts', '.dart', '.groovy',
    # Scripts
    '.ps1', '.psm1', '.psd1', '.bat', '.cmd', '.sh', '.bash', '.zsh', '.fish',
    # Configuración y datos
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config', '.env', '.env.example',
    # Bases de datos
    '.sql', '.sqlite', '.prisma', '.graphql', '.gql',
    # Documentación
    '.md', '.markdown', '.rst', '.txt',
    # Otros
    '.go', '.rs', '.r', '.pl', '.pm', '.lua', '.scala', '.groovy', '.gradle', '.dockerfile', '.tf', '.hcl',
    # Templates
    '.ejs', '.pug', '.jade', '.hbs', '.handlebars', '.mustache', '.twig', '.blade.php', '.erb', '.slim'
)

# Archivos específicos a incluir (sin extensión o con nombre exacto)
$archivosEspecificos = @(
    'Dockerfile',
    'Makefile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'package.json',
    'tsconfig.json',
    'webpack.config.js',
    'vite.config.js',
    'tailwind.config.js',
    'postcss.config.js',
    'jest.config.js',
    '.gitignore',
    '.editorconfig',
    '.eslintrc',
    '.prettierrc',
    'README',
    'LICENSE',
    'Gemfile',
    'Rakefile',
    'requirements.txt',
    'Pipfile',
    'Cargo.toml',
    'go.mod',
    'go.sum',
    'composer.json',
    'pom.xml',
    'build.gradle',
    'CMakeLists.txt'
)

# Directorios a excluir (comunes)
$directoriosExcluir = @(
    'node_modules',
    'vendor',
    '.git',
    '.svn',
    '.hg',
    'dist',
    'build',
    'out',
    'target',
    'bin',
    'obj',
    '.vs',
    '.vscode',
    '.idea',
    '__pycache__',
    '.pytest_cache',
    'coverage',
    '.next',
    '.nuxt',
    'storage',
    'cache',
    'logs',
    'tmp',
    'temp',
    'uploads',
    'assets',
    'images',
    'img',
    'fonts',
    'videos',
    'audio',
    '.terraform',
    'venv',
    'env',
    '.env',
    'site-packages',
    'egg-info'
)

# ============================================
# INICIO DEL SCRIPT
# ============================================

Write-Host "🔍 Iniciando dump de código..." -ForegroundColor Cyan
Write-Host "📁 Directorio base: $directorioBase" -ForegroundColor Gray
Write-Host ""

# Normalizar la ruta base para comparaciones
if ($directorioBase -is [System.Management.Automation.PathInfo]) {
    $rutaBaseNormalizada = $directorioBase.Path.TrimEnd('\', '/')
} else {
    $rutaBaseNormalizada = $directorioBase.ToString().TrimEnd('\', '/')
}

# Crear/acceder al archivo de salida
$streamWriter = [System.IO.StreamWriter]::new($archivoSalida, $false, [System.Text.Encoding]::UTF8)

try {
    # Escribir encabezado
    $streamWriter.WriteLine("=" * 80)
    $streamWriter.WriteLine("DUMP COMPLETO DE CÓDIGO")
    $streamWriter.WriteLine("Generado el: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    $streamWriter.WriteLine("Directorio: $directorioBase")
    $streamWriter.WriteLine("=" * 80)
    $streamWriter.WriteLine("")
    
    # ============================================
    # SECCIÓN 1: ESTRUCTURA DE DIRECTORIOS
    # ============================================
    Write-Host "📂 Generando estructura de directorios..." -ForegroundColor Yellow
    
    $streamWriter.WriteLine("")
    $streamWriter.WriteLine("#" * 80)
    $streamWriter.WriteLine("# SECCIÓN 1: ESTRUCTURA DE DIRECTORIOS Y ARCHIVOS")
    $streamWriter.WriteLine("#" * 80)
    $streamWriter.WriteLine("")
    
    # Función recursiva para listar estructura
    function Get-ArbolDirectorios {
        param(
            [string]$Path,
            [string]$Indent = ""
        )
        
        try {
            $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue | 
                     Where-Object { 
                         $nombre = $_.Name
                         # Excluir directorios de la lista
                         if ($_.PSIsContainer) {
                             return $directoriosExcluir -notcontains $nombre
                         }
                         return $true
                     }
            
            foreach ($item in $items) {
                if ($item.PSIsContainer) {
                    $streamWriter.WriteLine("$Indent📁 $($item.Name)/")
                    Get-ArbolDirectorios -Path $item.FullName -Indent "$Indent    "
                } else {
                    $streamWriter.WriteLine("$Indent📄 $($item.Name)")
                }
            }
        } catch {
            $streamWriter.WriteLine("$Indent⚠️ Error accediendo a: $Path")
        }
    }
    
    Get-ArbolDirectorios -Path $rutaBaseNormalizada
    
    # ============================================
    # SECCIÓN 2: CONTENIDO DE ARCHIVOS
    # ============================================
    Write-Host "📝 Extrayendo contenido de archivos..." -ForegroundColor Yellow
    
    $streamWriter.WriteLine("")
    $streamWriter.WriteLine("")
    $streamWriter.WriteLine("#" * 80)
    $streamWriter.WriteLine("# SECCIÓN 2: CONTENIDO DE ARCHIVOS DE CÓDIGO")
    $streamWriter.WriteLine("#" * 80)
    $streamWriter.WriteLine("")
    
    # Obtener todos los archivos recursivamente
    $todosLosArchivos = Get-ChildItem -Path $rutaBaseNormalizada -Recurse -File -Force -ErrorAction SilentlyContinue | 
        Where-Object {
            $archivo = $_
            $extension = $archivo.Extension.ToLower()
            $nombre = $archivo.Name
            
            # Verificar si está en directorio excluido
            # Usar FullName y verificar si contiene alguno de los directorios excluidos
            $enDirectorioExcluido = $false
            foreach ($dirExcluido in $directoriosExcluir) {
                $patron1 = "\$dirExcluido\"
                $patron2 = "/$dirExcluido/"
                if ($archivo.FullName.Contains($patron1) -or $archivo.FullName.Contains($patron2)) {
                    $enDirectorioExcluido = $true
                    break
                }
            }
            
            if ($enDirectorioExcluido) { return $false }
            
            # Verificar si es archivo de código por extensión o nombre específico
            $esCodigo = ($extensionesCodigo -contains $extension) -or 
                       ($archivosEspecificos -contains $nombre) -or
                       ($archivosEspecificos -contains ($nombre -replace '\.[^.]+$', ''))
            
            return $esCodigo
        } | Sort-Object FullName
    
    $totalArchivos = $todosLosArchivos.Count
    $contador = 0
    
    Write-Host "   Encontrados $totalArchivos archivos de código" -ForegroundColor Gray
    
    foreach ($archivo in $todosLosArchivos) {
        $contador++
        
        # Calcular ruta relativa de forma segura
        $rutaRelativa = $archivo.FullName.Substring($rutaBaseNormalizada.Length).TrimStart('\', '/')
        
        # Mostrar progreso
        if ($contador % 10 -eq 0 -or $contador -eq $totalArchivos) {
            Write-Host "   Procesando $contador de $totalArchivos... ($($archivo.Name))" -ForegroundColor DarkGray
        }
        
        # Escribir separador y metadatos del archivo
        $streamWriter.WriteLine("")
        $streamWriter.WriteLine("=" * 80)
        $streamWriter.WriteLine("ARCHIVO: $($archivo.Name)")
        $streamWriter.WriteLine("RUTA: $rutaRelativa")
        $streamWriter.WriteLine("DIRECTORIO: $($archivo.DirectoryName)")
        $streamWriter.WriteLine("TAMAÑO: $([math]::Round($archivo.Length / 1KB, 2)) KB")
        $streamWriter.WriteLine("MODIFICADO: $($archivo.LastWriteTime)")
        $streamWriter.WriteLine("=" * 80)
        $streamWriter.WriteLine("")
        
        # Leer y escribir contenido
        try {
            # Intentar leer como UTF-8 primero
            $contenido = Get-Content -Path $archivo.FullName -Raw -Encoding UTF8 -ErrorAction Stop
            
            # Si está vacío, indicarlo
            if ([string]::IsNullOrWhiteSpace($contenido)) {
                $streamWriter.WriteLine("[ARCHIVO VACÍO]")
            } else {
                $streamWriter.WriteLine($contenido)
            }
        } catch {
            try {
                # Intentar con encoding por defecto
                $contenido = Get-Content -Path $archivo.FullName -Raw -ErrorAction Stop
                $streamWriter.WriteLine($contenido)
            } catch {
                $streamWriter.WriteLine("[ERROR AL LEER ARCHIVO: $($_.Exception.Message)]")
            }
        }
        
        $streamWriter.WriteLine("")
        $streamWriter.WriteLine("")
    }
    
    # ============================================
    # SECCIÓN 3: RESUMEN
    # ============================================
    $streamWriter.WriteLine("")
    $streamWriter.WriteLine("#" * 80)
    $streamWriter.WriteLine("# SECCIÓN 3: RESUMEN")
    $streamWriter.WriteLine("#" * 80)
    $streamWriter.WriteLine("")
    $streamWriter.WriteLine("Total de archivos procesados: $totalArchivos")
    $streamWriter.WriteLine("Archivo generado: $archivoSalida")
    $streamWriter.WriteLine("Fin del dump: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    $streamWriter.WriteLine("")
    $streamWriter.WriteLine("=" * 80)
    
    Write-Host ""
    Write-Host "✅ ¡Dump completado exitosamente!" -ForegroundColor Green
    Write-Host "📄 Archivo generado: $archivoSalida" -ForegroundColor Cyan
    Write-Host "📊 Total archivos procesados: $totalArchivos" -ForegroundColor Gray
    
} finally {
    $streamWriter.Close()
    $streamWriter.Dispose()
}