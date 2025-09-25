# MITHRA Energy Analyzer - Auto Docker Setup & Launch Script
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

function Test-DockerInstalled {
    $dockerVersion = cmd /c "docker --version 2>nul"
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker is installed: $dockerVersion"
        return $true
    }
    
    Write-Error "Docker not found on system"
    return $false
}

function Test-DockerRunning {
    $null = cmd /c "docker info 2>nul"
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker Desktop is running"
        return $true
    }
    
    Write-Warning "Docker Desktop is not running"
    return $false
}

function Install-Docker {
    Write-Info "Docker installation required"
    Write-Info "Please install Docker Desktop from: https://docker.com"
    Write-Info "After installation, run this script again."
    
    $response = Read-Host "Open Docker download page? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Start-Process "https://www.docker.com/products/docker-desktop/"
    }
    exit 1
}

function Start-DockerDesktop {
    Write-Info "Attempting to start Docker Desktop..."
    
    $dockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Info "Docker Desktop starting... Please wait 30-60 seconds"
        Start-Sleep 10
        return $true
    }
    
    Write-Warning "Docker Desktop not found. Please start it manually."
    return $false
}

function Build-Application {
    Write-Info "Building MITHRA Docker image..."
    
    # Use cmd to run docker to avoid PowerShell interpretation issues
    $buildResult = cmd /c "docker build -t mithra-energy-analyzer . 2>&1"
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker image built successfully"
        return $true
    } else {
        Write-Error "Failed to build Docker image"
        Write-Host $buildResult -ForegroundColor Red
        return $false
    }
}

function Start-Application {
    Write-Info "Starting MITHRA Energy Analyzer..."
    Write-Success "Application will be available at: http://localhost:3000"
    Write-Warning "Press Ctrl+C to stop the application"
    
    try {
        # Clean up any existing container
        cmd /c "docker stop mithra-app 2>nul" | Out-Null
        cmd /c "docker rm mithra-app 2>nul" | Out-Null
        
        # Start the application
        docker run --name mithra-app -p 3000:3000 mithra-energy-analyzer
    } catch {
        Write-Error "Failed to start application"
        exit 1
    }
}

# Main execution
Write-Host ""
Write-Info "MITHRA Energy Analyzer - Docker Launcher"
Write-Info "========================================"

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "Please run this script from the mithra-energy-analyzer directory"
    exit 1
}

# Check Docker installation
if (-not (Test-DockerInstalled)) {
    if ($SkipInstall) {
        Write-Error "Docker not installed and -SkipInstall specified"
        exit 1
    }
    Install-Docker
}

# Check if Docker is running
if (-not (Test-DockerRunning)) {
    Write-Info "Docker found but not running..."
    Start-DockerDesktop
    
    # Wait and check again
    Write-Info "Waiting for Docker Desktop to start..."
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep 5
        if (Test-DockerRunning) {
            break
        }
        Write-Host "." -NoNewline
    }
    Write-Host ""
    
    if (-not (Test-DockerRunning)) {
        Write-Error "Docker Desktop did not start. Please start it manually and try again."
        exit 1
    }
}

# Build and start the application
if (Build-Application) {
    Start-Application
} else {
    Write-Error "Failed to build application"
    exit 1
}