#!/bin/bash

# Cron Jobs Testing Script (curl version)
# Run with: bash scripts/test-cron-curl.sh
# 
# This script tests all cron job endpoints using curl
# 
# Set environment variables before running:
# export CRON_SECRET="your-secret"
# export MISSED_REMINDERS_CRON_SECRET="your-secret"
# export INACTIVITY_CRON_SECRET="your-secret"
# export DIGEST_CRON_SECRET="your-secret"

BASE_URL="${1:-http://localhost:3000}"
AUTH_METHOD="${2:-1}"

echo "🚀 Cron Jobs Testing Script (curl)"
echo "=================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Prepare headers based on auth method
case $AUTH_METHOD in
  1)
    HEADER="x-vercel-cron: 1"
    echo -e "${GREEN}Using: Vercel Cron Header${NC}"
    ;;
  2)
    if [ -z "$CRON_SECRET" ]; then
      echo -e "${YELLOW}Warning: CRON_SECRET not set. Using no authentication.${NC}"
      HEADER=""
    else
      HEADER="Authorization: Bearer $CRON_SECRET"
      echo -e "${GREEN}Using: CRON_SECRET${NC}"
    fi
    ;;
  3)
    echo -e "${GREEN}Using: Custom Secrets (per endpoint)${NC}"
    ;;
  4)
    echo -e "${YELLOW}Using: No Authentication (development mode)${NC}"
    HEADER=""
    ;;
esac

test_endpoint() {
  local name=$1
  local url=$2
  local header=$3
  
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${BLUE}Testing: $name${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""
  echo "URL: $url"
  if [ -n "$header" ]; then
    echo "Header: $header"
  fi
  echo ""
  
  if [ -n "$header" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
      -H "Content-Type: application/json" \
      -H "$header")
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
      -H "Content-Type: application/json")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  echo "Status: $http_code"
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ $name - SUCCESS${NC}"
    return 0
  else
    echo -e "${RED}❌ $name - FAILED${NC}"
    return 1
  fi
}

# Test endpoints
passed=0
failed=0

# Test 1: Check Missed Reminders
if [ "$AUTH_METHOD" = "3" ] && [ -n "$MISSED_REMINDERS_CRON_SECRET" ]; then
  test_header="Authorization: Bearer $MISSED_REMINDERS_CRON_SECRET"
elif [ -n "$HEADER" ]; then
  test_header="$HEADER"
else
  test_header=""
fi

if test_endpoint "Check Missed Reminders" "$BASE_URL/api/reminders/check-missed" "$test_header"; then
  ((passed++))
else
  ((failed++))
fi

# Test 2: Daily Cron (Combined: Inactivity + Expire Trials)
if test_endpoint "Daily Cron Job" "$BASE_URL/api/cron/daily" "$HEADER"; then
  ((passed++))
else
  ((failed++))
fi

# Test 3: Generate Digests
if [ "$AUTH_METHOD" = "3" ] && [ -n "$DIGEST_CRON_SECRET" ]; then
  test_header="Authorization: Bearer $DIGEST_CRON_SECRET"
elif [ -n "$HEADER" ]; then
  test_header="$HEADER"
else
  test_header=""
fi

if test_endpoint "Generate Digests" "$BASE_URL/api/digests/generate" "$test_header"; then
  ((passed++))
else
  ((failed++))
fi

# Summary
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo "Total: $((passed + failed)) | Passed: $passed | Failed: $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 All cron jobs are working correctly!${NC}"
else
  echo -e "${YELLOW}⚠️  Some cron jobs failed. Check the errors above.${NC}"
fi

echo ""
echo "💡 Tips:"
echo "1. Make sure your development server is running (npm run dev)"
echo "2. Check that database migrations are applied"
echo "3. Verify environment variables are set correctly"
echo "4. In production, Vercel will automatically add CRON_SECRET to Authorization header"
echo ""

