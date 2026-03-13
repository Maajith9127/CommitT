#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Quick Push Script
# Usage: ./scripts/push.sh "commit message"
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get commit message
MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    echo -e "${YELLOW}Usage: ./scripts/push.sh \"your commit message\"${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Staging all changes...${NC}"
git add -A

echo -e "${BLUE}💾 Committing: ${MESSAGE}${NC}"
git commit -m "$MESSAGE"

echo -e "${BLUE}🚀 Pushing to origin...${NC}"
git push

echo -e "${GREEN}✅ Done! Changes pushed successfully.${NC}"
