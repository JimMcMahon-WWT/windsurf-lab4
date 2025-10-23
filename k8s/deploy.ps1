# Kubernetes Deployment Script for E-commerce Platform (PowerShell)

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('build', 'deploy', 'all', 'clean')]
    [string]$Action = 'all',
    
    [Parameter(Mandatory=$false)]
    [string]$Registry = 'your-registry',
    
    [Parameter(Mandatory=$false)]
    [string]$Version = 'latest'
)

$ErrorActionPreference = 'Stop'

$Namespace = 'ecommerce'

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Information {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

function Test-Prerequisites {
    Write-Information "Checking prerequisites..."
    
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Failure "kubectl not found. Please install kubectl."
        exit 1
    }
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Failure "docker not found. Please install docker."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Build-Images {
    Write-Information "Building Docker images..."
    
    Push-Location ..
    docker-compose build
    Pop-Location
    
    Write-Success "Docker images built"
}

function Push-Images {
    Write-Information "Tagging and pushing images to registry..."
    
    $services = @('user-service', 'product-service', 'order-service', 'payment-service')
    
    foreach ($service in $services) {
        docker tag "ecommerce/$service:latest" "$Registry/$service:$Version"
        docker push "$Registry/$service:$Version"
        Write-Success "Pushed $service:$Version"
    }
}

function New-Namespace {
    Write-Information "Creating namespace..."
    
    $existing = kubectl get namespace $Namespace 2>$null
    if ($existing) {
        Write-Information "Namespace $Namespace already exists"
    } else {
        kubectl apply -f namespace.yaml
        Write-Success "Namespace created"
    }
}

function Set-Configs {
    Write-Information "Applying ConfigMaps and Secrets..."
    
    kubectl apply -f configmap.yaml
    kubectl apply -f secrets.yaml
    
    Write-Success "ConfigMaps and Secrets applied"
}

function Deploy-Services {
    Write-Information "Deploying services..."
    
    kubectl apply -f user-service.yaml
    kubectl apply -f product-service.yaml
    kubectl apply -f order-service.yaml
    kubectl apply -f payment-service.yaml
    
    Write-Success "Services deployed"
}

function Deploy-Ingress {
    Write-Information "Deploying ingress..."
    
    kubectl apply -f ingress.yaml
    
    Write-Success "Ingress deployed"
}

function Deploy-HPA {
    Write-Information "Deploying HPA..."
    
    kubectl apply -f hpa.yaml
    
    Write-Success "HPA deployed"
}

function Deploy-Monitoring {
    Write-Information "Deploying monitoring stack..."
    
    kubectl apply -f monitoring/prometheus-config.yaml
    kubectl apply -f monitoring/grafana.yaml
    
    Write-Success "Monitoring deployed"
}

function Wait-ForPods {
    Write-Information "Waiting for pods to be ready..."
    
    kubectl wait --for=condition=ready pod --all --namespace=$Namespace --timeout=300s
    
    Write-Success "All pods are ready"
}

function Show-Status {
    Write-Host "`n=========================================" -ForegroundColor Cyan
    Write-Host "  Deployment Status" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    Write-Host "`nPods:" -ForegroundColor Yellow
    kubectl get pods -n $Namespace
    
    Write-Host "`nServices:" -ForegroundColor Yellow
    kubectl get services -n $Namespace
    
    Write-Host "`nIngress:" -ForegroundColor Yellow
    kubectl get ingress -n $Namespace
    
    Write-Host "`nHPA:" -ForegroundColor Yellow
    kubectl get hpa -n $Namespace
    
    Write-Success "`nDeployment completed successfully!"
}

function Remove-Resources {
    Write-Information "Cleaning up..."
    kubectl delete namespace $Namespace
    Write-Success "Cleanup completed"
}

# Main execution
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  E-commerce Platform Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

try {
    switch ($Action) {
        'build' {
            Test-Prerequisites
            Build-Images
            Push-Images
        }
        'deploy' {
            Test-Prerequisites
            New-Namespace
            Set-Configs
            Deploy-Services
            Deploy-Ingress
            Deploy-HPA
            Deploy-Monitoring
            Wait-ForPods
            Show-Status
        }
        'all' {
            Test-Prerequisites
            Build-Images
            Push-Images
            New-Namespace
            Set-Configs
            Deploy-Services
            Deploy-Ingress
            Deploy-HPA
            Deploy-Monitoring
            Wait-ForPods
            Show-Status
        }
        'clean' {
            Remove-Resources
        }
    }
}
catch {
    Write-Failure "Error: $_"
    exit 1
}
