#!/bin/bash
# Kubernetes Deployment Script for E-commerce Platform

set -e

echo "========================================="
echo "  E-commerce Platform Deployment"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="ecommerce"
REGISTRY="${DOCKER_REGISTRY:-your-registry}"
VERSION="${VERSION:-latest}"

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "docker not found. Please install docker."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

build_images() {
    print_info "Building Docker images..."
    
    cd ..
    docker-compose build
    
    print_success "Docker images built"
}

tag_and_push() {
    print_info "Tagging and pushing images to registry..."
    
    services=("user-service" "product-service" "order-service" "payment-service")
    
    for service in "${services[@]}"; do
        docker tag "ecommerce/${service}:latest" "${REGISTRY}/${service}:${VERSION}"
        docker push "${REGISTRY}/${service}:${VERSION}"
        print_success "Pushed ${service}:${VERSION}"
    done
}

create_namespace() {
    print_info "Creating namespace..."
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_info "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f namespace.yaml
        print_success "Namespace created"
    fi
}

apply_configs() {
    print_info "Applying ConfigMaps and Secrets..."
    
    kubectl apply -f configmap.yaml
    kubectl apply -f secrets.yaml
    
    print_success "ConfigMaps and Secrets applied"
}

deploy_services() {
    print_info "Deploying services..."
    
    kubectl apply -f user-service.yaml
    kubectl apply -f product-service.yaml
    kubectl apply -f order-service.yaml
    kubectl apply -f payment-service.yaml
    
    print_success "Services deployed"
}

deploy_ingress() {
    print_info "Deploying ingress..."
    
    kubectl apply -f ingress.yaml
    
    print_success "Ingress deployed"
}

deploy_hpa() {
    print_info "Deploying HPA..."
    
    kubectl apply -f hpa.yaml
    
    print_success "HPA deployed"
}

deploy_monitoring() {
    print_info "Deploying monitoring stack..."
    
    kubectl apply -f monitoring/prometheus-config.yaml
    kubectl apply -f monitoring/grafana.yaml
    
    print_success "Monitoring deployed"
}

wait_for_pods() {
    print_info "Waiting for pods to be ready..."
    
    kubectl wait --for=condition=ready pod \
        --all \
        --namespace=$NAMESPACE \
        --timeout=300s
    
    print_success "All pods are ready"
}

show_status() {
    echo ""
    echo "========================================="
    echo "  Deployment Status"
    echo "========================================="
    
    echo -e "\n${YELLOW}Pods:${NC}"
    kubectl get pods -n $NAMESPACE
    
    echo -e "\n${YELLOW}Services:${NC}"
    kubectl get services -n $NAMESPACE
    
    echo -e "\n${YELLOW}Ingress:${NC}"
    kubectl get ingress -n $NAMESPACE
    
    echo -e "\n${YELLOW}HPA:${NC}"
    kubectl get hpa -n $NAMESPACE
    
    echo ""
    print_success "Deployment completed successfully!"
}

# Main execution
main() {
    case "${1:-all}" in
        build)
            check_prerequisites
            build_images
            tag_and_push
            ;;
        deploy)
            check_prerequisites
            create_namespace
            apply_configs
            deploy_services
            deploy_ingress
            deploy_hpa
            deploy_monitoring
            wait_for_pods
            show_status
            ;;
        all)
            check_prerequisites
            build_images
            tag_and_push
            create_namespace
            apply_configs
            deploy_services
            deploy_ingress
            deploy_hpa
            deploy_monitoring
            wait_for_pods
            show_status
            ;;
        clean)
            print_info "Cleaning up..."
            kubectl delete namespace $NAMESPACE
            print_success "Cleanup completed"
            ;;
        *)
            echo "Usage: $0 {build|deploy|all|clean}"
            echo "  build  - Build and push Docker images"
            echo "  deploy - Deploy to Kubernetes"
            echo "  all    - Build and deploy (default)"
            echo "  clean  - Delete all resources"
            exit 1
            ;;
    esac
}

main "$@"
