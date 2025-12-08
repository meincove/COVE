#!/bin/bash

# COVE Deployment Setup Script
# Initializes all necessary databases and configurations for a fresh deployment

set -e  # Exit on error

echo "=================================="
echo "🚀 COVE Deployment Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
check_env_files() {
    echo -e "\n${YELLOW}📋 Checking environment files...${NC}"
    
    if [ ! -f "cove-ai-core/.env" ]; then
        echo -e "${RED}❌ Missing cove-ai-core/.env${NC}"
        echo "Please copy .env.example to .env and configure it"
        exit 1
    fi
    
    if [ ! -f "backend/.env" ]; then
        echo -e "${RED}❌ Missing backend/.env${NC}"
        echo "Please copy .env.example to .env and configure it"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment files found${NC}"
}

# Install Python dependencies
install_python_deps() {
    echo -e "\n${YELLOW}📦 Installing Python dependencies...${NC}"
    
    cd cove-ai-core
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi
    source .venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1
    cd ..
    
    cd backend
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi
    source .venv/bin/activate
    pip install -r requirements.txt > /dev/null 2>&1
    cd ..
    
    echo -e "${GREEN}✅ Python dependencies installed${NC}"
}

# Install Node dependencies
install_node_deps() {
    echo -e "\n${YELLOW}📦 Installing Node dependencies...${NC}"
    
    cd frontend
    npm install > /dev/null 2>&1
    cd ..
    
    echo -e "${GREEN}✅ Node dependencies installed${NC}"
}

# Seed Neo4j with products
seed_neo4j() {
    echo -e "\n${YELLOW}🗄️  Seeding Neo4j with product data...${NC}"
    
    cd cove-ai-core
    source .venv/bin/activate
    python scripts/seed_products.py
    cd ..
    
    echo -e "${GREEN}✅ Neo4j seeded${NC}"
}

# Setup vector store
setup_vectors() {
    echo -e "\n${YELLOW}🔢 Setting up vector embeddings...${NC}"
    
    cd cove-ai-core
    source .venv/bin/activate
    python scripts/setup_vectors.py
    cd ..
    
    echo -e "${GREEN}✅ Vector store initialized${NC}"
}

# Run Django migrations
run_migrations() {
    echo -e "\n${YELLOW}🔄 Running Django migrations...${NC}"
    
    cd backend
    source .venv/bin/activate
    python manage.py migrate > /dev/null 2>&1
    cd ..
    
    echo -e "${GREEN}✅ Migrations complete${NC}"
}

# Create Django superuser (optional)
create_superuser() {
    echo -e "\n${YELLOW}👤 Create Django superuser? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cd backend
        source .venv/bin/activate
        python manage.py createsuperuser
        cd ..
    fi
}

# Verify setup
verify_setup() {
    echo -e "\n${YELLOW}🔍 Verifying setup...${NC}"
    
    # Check if Neo4j is accessible
    cd cove-ai-core
    source .venv/bin/activate
    python -c "from app.vector.store import get_conn_sync; get_conn_sync()" 2>/dev/null && echo -e "${GREEN}✅ Neo4j connection OK${NC}" || echo -e "${RED}❌ Neo4j connection failed${NC}"
    cd ..
}

# Main execution
main() {
    check_env_files
    install_python_deps
    install_node_deps
    run_migrations
    seed_neo4j
    setup_vectors
    create_superuser
    verify_setup
    
    echo -e "\n=================================="
    echo -e "${GREEN}✅ DEPLOYMENT SETUP COMPLETE!${NC}"
    echo -e "=================================="
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Start FastAPI:  cd cove-ai-core && uvicorn app.main:app --reload --port 8000"
    echo "2. Start Django:   cd backend && python manage.py runserver 8001"
    echo "3. Start Frontend: cd frontend && npm run dev"
}

main
