#!/bin/bash
# Hercules UK - Deployment Script
# This script ensures all deployments go through GitHub

set -e

cd "/home/kamindu/hercules-headless-uk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Hercules UK Deployment ===${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${YELLOW}Uncommitted changes detected:${NC}"
    git status --short
    echo ""

    # Prompt for commit message
    read -p "Enter commit message (or 'q' to quit): " COMMIT_MSG

    if [[ "$COMMIT_MSG" == "q" ]]; then
        echo -e "${RED}Deployment cancelled.${NC}"
        exit 1
    fi

    # Stage and commit
    git add -A
    git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

    echo -e "${GREEN}Changes committed.${NC}"
else
    echo -e "${GREEN}No uncommitted changes.${NC}"
fi

# Check if we're ahead of origin
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")

if [[ "$AHEAD" -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}$AHEAD commit(s) to push to GitHub.${NC}"

    # Push to GitHub
    echo "Pushing to GitHub..."
    git push origin main

    echo -e "${GREEN}Pushed to GitHub!${NC}"
    echo ""
    echo -e "${YELLOW}GitHub Actions will automatically deploy the site.${NC}"
    echo ""

    # Watch the deployment
    echo "Checking deployment status..."
    sleep 3
    gh run list --limit 1

    echo ""
    echo -e "${GREEN}Deployment triggered! Run 'gh run watch' to monitor progress.${NC}"
else
    echo -e "${GREEN}Already up to date with GitHub.${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
