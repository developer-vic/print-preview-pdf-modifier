#!/bin/bash

# Print Preview PDF Modifier - One-Command Setup Script
# This script will install all dependencies and start the project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}  Print Preview PDF Modifier${NC}"
    echo -e "${PURPLE}  One-Command Setup Script${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="16.0.0"
        
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
            return 0
        else
            print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
            return 1
        fi
    else
        print_error "Node.js is not installed"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencies installed successfully"
    else
        print_error "package.json not found in current directory"
        exit 1
    fi
}

# Function to install Playwright browsers
install_playwright() {
    print_status "Installing Playwright browsers..."
    npx playwright install
    print_success "Playwright browsers installed successfully"
}

# Function to check if ports are available
check_ports() {
    print_status "Checking if required ports are available..."
    
    # Check if port 3000 is available (backend)
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3000 is already in use. Backend might not start properly."
    else
        print_success "Port 3000 is available for backend"
    fi
    
    # Check if port 3001 is available (frontend)
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 is already in use. Frontend might not start properly."
    else
        print_success "Port 3001 is available for frontend"
    fi
}

# Function to start the project
start_project() {
    print_status "Starting Print Preview PDF Modifier..."
    print_status "Both backend and frontend services will start now."
    print_status "Press Ctrl+C to stop both services."
    echo ""
    
    # Start the project using the launcher
    npm start
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --skip-install    Skip dependency installation"
    echo "  --skip-playwright Skip Playwright browser installation"
    echo "  --check-only      Only check system requirements, don't install or start"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Full setup and start"
    echo "  $0 --skip-install # Start without reinstalling dependencies"
    echo "  $0 --check-only   # Only check if system is ready"
}

# Main setup function
main() {
    print_header
    
    # Parse command line arguments
    SKIP_INSTALL=false
    SKIP_PLAYWRIGHT=false
    CHECK_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-install)
                SKIP_INSTALL=true
                shift
                ;;
            --skip-playwright)
                SKIP_PLAYWRIGHT=true
                shift
                ;;
            --check-only)
                CHECK_ONLY=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check system requirements
    print_status "Checking system requirements..."
    
    if ! check_node_version; then
        print_error "Please install Node.js 16.0.0 or higher from https://nodejs.org/"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install Node.js which includes npm."
        exit 1
    fi
    
    print_success "System requirements check passed"
    
    if [ "$CHECK_ONLY" = true ]; then
        print_success "System check completed. Ready to run the project!"
        exit 0
    fi
    
    # Check ports
    check_ports
    
    # Install dependencies if not skipped
    if [ "$SKIP_INSTALL" = false ]; then
        install_dependencies
        
        # Install Playwright browsers if not skipped
        if [ "$SKIP_PLAYWRIGHT" = false ]; then
            install_playwright
        fi
    else
        print_warning "Skipping dependency installation"
    fi
    
    # Start the project
    start_project
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Setup interrupted by user${NC}"; exit 130' INT

# Run main function with all arguments
main "$@"
