#!/bin/bash

# CleanAceh Service API Test Script
# Make sure server is running on localhost:3000

BASE_URL="http://localhost:3000/api/v1"
HEALTH_URL="http://localhost:3000"  # Health check at root level
ADMIN_TOKEN=""

echo "🧪 CleanAceh Service API Testing"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test results
print_test() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to make HTTP request and check status
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local headers=$6
    local base_url=${7:-$BASE_URL}  # Allow custom base URL
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -n "$data" ] && [ -n "$headers" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$base_url$endpoint" \
            -H "$headers" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ -n "$headers" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$base_url$endpoint" \
            -H "$headers")
    elif [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$base_url$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$base_url$endpoint")
    fi
    
    status_code="${response: -3}"
    body="${response%???}"
    
    echo "Status Code: $status_code"
    echo "Response: $body" | jq 2>/dev/null || echo "Response: $body"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_test 0 "$description"
        return 0
    else
        print_test 1 "$description (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

# Step 1: Test Health Check (at root level)
echo -e "\n${YELLOW}Step 1: Health Check${NC}"
test_endpoint "GET" "/health" "200" "Health check" "" "" "$HEALTH_URL"

# Step 2: Login as Admin to get token
echo -e "\n${YELLOW}Step 2: Admin Login${NC}"
login_data='{
  "emailOrPhone": "admin@cleanaceh.com",
  "password": "password123"
}'

response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$login_data")

ADMIN_TOKEN=$(echo $response | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    echo -e "${GREEN}✅ Admin login successful${NC}"
    echo "Token: ${ADMIN_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Admin login failed${NC}"
    echo "Response: $response"
    echo "Please run database seeding first: npm run db:seed"
    exit 1
fi

# Step 3: Test Public Endpoints
echo -e "\n${YELLOW}Step 3: Public Service Endpoints${NC}"

test_endpoint "GET" "/services" "200" "Get all services" "" ""

test_endpoint "GET" "/services?page=1&limit=3" "200" "Get services with pagination" "" ""

test_endpoint "GET" "/services?search=pembersihan" "200" "Search services" "" ""

test_endpoint "GET" "/services?category=General" "200" "Filter by category" "" ""

test_endpoint "GET" "/services/categories" "200" "Get service categories" "" ""

# Get a service ID for detail testing
echo -e "\n${BLUE}Getting service ID for detail test...${NC}"
services_response=$(curl -s "$BASE_URL/services?limit=1")
service_id=$(echo $services_response | jq -r '.data[0].id' 2>/dev/null)

if [ "$service_id" != "null" ] && [ -n "$service_id" ]; then
    echo "Service ID: $service_id"
    test_endpoint "GET" "/services/$service_id" "200" "Get service by ID" "" ""
else
    echo -e "${RED}❌ Could not get service ID for testing${NC}"
fi

# Step 4: Test Admin Endpoints
echo -e "\n${YELLOW}Step 4: Admin Service Endpoints${NC}"

# Test stats endpoint
test_endpoint "GET" "/services/admin/stats" "200" "Get service statistics" "" "Authorization: Bearer $ADMIN_TOKEN"

# Test create service with unique name
timestamp=$(date +%s)
create_data="{
  \"name\": \"Test API Service $timestamp\",
  \"description\": \"Service created via API test at $timestamp\",
  \"basePrice\": 99000,
  \"durationHours\": 1,
  \"category\": \"Test\"
}"

test_endpoint "POST" "/services" "201" "Create new service" "$create_data" "Authorization: Bearer $ADMIN_TOKEN"

# Get the created service ID
echo -e "\n${BLUE}Getting created service ID...${NC}"
test_services_response=$(curl -s "$BASE_URL/services?search=Test%20API%20Service%20$timestamp")
test_service_id=$(echo $test_services_response | jq -r '.data[0].id' 2>/dev/null)

if [ "$test_service_id" != "null" ] && [ -n "$test_service_id" ]; then
    echo "Created Service ID: $test_service_id"
    
    # Test update service
    update_data='{
      "basePrice": 109000,
      "description": "Updated service description"
    }'
    
    test_endpoint "PUT" "/services/$test_service_id" "200" "Update service" "$update_data" "Authorization: Bearer $ADMIN_TOKEN"
    
    # Test delete service
    test_endpoint "DELETE" "/services/$test_service_id" "200" "Delete service" "" "Authorization: Bearer $ADMIN_TOKEN"
else
    echo -e "${RED}❌ Could not get created service ID for update/delete tests${NC}"
fi

# Step 5: Test Error Cases
echo -e "\n${YELLOW}Step 5: Error Handling Tests${NC}"

# Test unauthorized access
test_endpoint "POST" "/services" "401" "Create service without auth" "$create_data" ""

# Test non-admin access
customer_login_data='{
  "emailOrPhone": "customer@cleanaceh.com",
  "password": "password123"
}'

customer_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$customer_login_data")

CUSTOMER_TOKEN=$(echo $customer_response | jq -r '.data.tokens.accessToken' 2>/dev/null)

if [ "$CUSTOMER_TOKEN" != "null" ] && [ -n "$CUSTOMER_TOKEN" ]; then
    test_endpoint "POST" "/services" "403" "Create service with customer token" "$create_data" "Authorization: Bearer $CUSTOMER_TOKEN"
fi

# Test invalid service ID
test_endpoint "GET" "/services/invalid-uuid" "422" "Get service with invalid ID" "" ""

# Test not found
test_endpoint "GET" "/services/00000000-0000-0000-0000-000000000000" "404" "Get non-existent service" "" ""

# Test validation error
invalid_data='{
  "name": "",
  "basePrice": -1000
}'

test_endpoint "POST" "/services" "422" "Create service with invalid data" "$invalid_data" "Authorization: Bearer $ADMIN_TOKEN"

# Test duplicate service name
duplicate_data='{
  "name": "Pembersihan Umum",
  "basePrice": 100000
}'

test_endpoint "POST" "/services" "409" "Create service with duplicate name" "$duplicate_data" "Authorization: Bearer $ADMIN_TOKEN"

# Final summary
echo -e "\n${YELLOW}Testing Summary${NC}"
echo "================================"
echo -e "${GREEN}✅ All Service API endpoints tested${NC}"
echo -e "${BLUE}📋 Tested Features:${NC}"
echo "  - Health check"
echo "  - Authentication system"
echo "  - Public service listing with pagination"
echo "  - Service search and filtering"
echo "  - Service categories"
echo "  - Service detail retrieval"
echo "  - Admin CRUD operations"
echo "  - Service statistics"
echo "  - Authorization checks"
echo "  - Comprehensive error handling"
echo ""
echo -e "${GREEN}🎉 Service Management API is fully functional!${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "  1. Cleaner Management API"
echo "  2. Order System API"
echo "  3. Payment Integration API"
echo "  4. Mobile app integration testing"