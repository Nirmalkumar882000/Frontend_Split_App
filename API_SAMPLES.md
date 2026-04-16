# Splitwise Clone API Samples

### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
-H "Content-Type: application/json" \
-d '{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "john@example.com",
  "password": "password123"
}'
```
*Note: Save the token from the response.*

### 3. Create Group
```bash
curl -X POST http://localhost:5000/api/groups \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-d '{
  "name": "Ski Trip"
}'
```

### 4. Add Member to Group
```bash
curl -X POST http://localhost:5000/api/groups/1/members \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-d '{
  "email": "friend@example.com"
}'
```

### 5. Add Expense
```bash
curl -X POST http://localhost:5000/api/expenses \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-d '{
  "groupId": 1,
  "amount": 150.00,
  "description": "Cabin Rental",
  "paidBy": 1
}'
```

### 6. Get Balances
```bash
curl -X GET http://localhost:5000/api/expenses/balances/1 \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. Get Settlements (Simplified)
```bash
curl -X GET http://localhost:5000/api/expenses/settlements/1 \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```
