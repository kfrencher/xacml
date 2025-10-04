#!/bin/bash

# AuthzForce Docker Setup Script
# This script helps set up and manage the AuthzForce server for XACML testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
}

start_authzforce() {
    log_info "Starting AuthzForce server..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_info "Waiting for AuthzForce to be ready..."
    
    # Wait for the healthcheck to pass
    timeout=300  # 5 minutes
    elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker-compose -f "$COMPOSE_FILE" ps authzforce | grep -q "healthy"; then
            log_info "AuthzForce server is ready!"
            log_info "AuthzForce URL: http://localhost:8080/authzforce-ce"
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    echo ""
    log_error "AuthzForce failed to start within $timeout seconds"
    show_logs
    exit 1
}

stop_authzforce() {
    log_info "Stopping AuthzForce server..."
    docker-compose -f "$COMPOSE_FILE" down
    log_info "AuthzForce server stopped"
}

restart_authzforce() {
    log_info "Restarting AuthzForce server..."
    stop_authzforce
    start_authzforce
}

show_status() {
    log_info "AuthzForce server status:"
    docker-compose -f "$COMPOSE_FILE" ps
}

show_logs() {
    log_info "AuthzForce server logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 authzforce
}

follow_logs() {
    log_info "Following AuthzForce server logs (Ctrl+C to stop):"
    docker-compose -f "$COMPOSE_FILE" logs -f authzforce
}

cleanup() {
    log_info "Cleaning up AuthzForce containers and volumes..."
    docker-compose -f "$COMPOSE_FILE" down -v
    log_info "Cleanup complete"
}

test_connection() {
    log_info "Testing connection to AuthzForce..."
    
    if curl -f -s http://localhost:8080/authzforce-ce/domains > /dev/null; then
        log_info "✓ AuthzForce is responding correctly"
        log_info "Available endpoints:"
        echo "  - Health: http://localhost:8080/authzforce-ce/domains"
        echo "  - API Docs: http://localhost:8080/authzforce-ce"
    else
        log_error "✗ AuthzForce is not responding"
        show_logs
        exit 1
    fi
}

show_help() {
    echo "AuthzForce Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     - Start AuthzForce server"
    echo "  stop      - Stop AuthzForce server"
    echo "  restart   - Restart AuthzForce server"
    echo "  status    - Show container status"
    echo "  logs      - Show recent logs"
    echo "  follow    - Follow logs in real-time"
    echo "  test      - Test connection to AuthzForce"
    echo "  cleanup   - Stop and remove containers/volumes"
    echo "  help      - Show this help message"
    echo ""
}

# Main script logic
check_docker

case "${1:-help}" in
    start)
        start_authzforce
        test_connection
        ;;
    stop)
        stop_authzforce
        ;;
    restart)
        restart_authzforce
        test_connection
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    follow)
        follow_logs
        ;;
    test)
        test_connection
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac