# SplitShare - API Documentation

This document outlines the core API endpoints for the SplitShare backend.

## Base URL
`http://localhost:5000/api`

## 🔐 Authentication

### Register User
`POST /auth/register`
- **Body**: `{ name, email, password }`
- **Response**: `{ success: true, token, user }`

### Login User
`POST /auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ success: true, token, user }`

### Update Profile
`PUT /auth/profile` (Protected)
- **Body**: `{ name, email, image }`
- **Response**: `{ success: true, result: { id, name, email, image } }`

### Change Password
`POST /auth/change-password` (Protected)
- **Body**: `{ currentPassword, newPassword }`
- **Response**: `{ success: true, message: "Password changed successfully" }`

---

## 👥 Groups

### Create Group
`POST /groups/create` (Protected)
- **Body**: `{ name }`
- **Response**: `{ success: true, result: { groupId } }`

### Get My Groups
`GET /groups` (Protected)
- **Query Params**: `search`, `page`, `limit`
- **Response**: `{ success: true, result: { groups: [], total, totalPages, ... } }`
- **Note**: Each group includes the `balance` property calculated dynamically for the requester.

### Get Group Details
`GET /groups/:groupId` (Protected)
- **Response**: `{ success: true, result: { group, members, expenses, ... } }`

### Add Member
`POST /groups/:groupId/add-member` (Protected)
- **Body**: `{ email }`
- **Response**: `{ success: true, message: "Member added" }`

---

## 💰 Expenses & Payments

### Add Expense
`POST /expenses/add` (Protected)
- **Body**: `{ groupId, amount, description, paidBy }`
- **Response**: `{ success: true, result: { expenseId } }`
- **Flow**: Splitting is handled automatically among all current group members.

### Record Payment (Settlement)
`POST /expenses/record-payment` (Protected)
- **Body**: `{ groupId, payerId, receiverId, amount }`
- **Response**: `{ success: true, message: "Payment recorded" }`

---

## 💬 Messaging (Real-time)

### Fetch Messages
`GET /messages/:groupId` (Protected)
- **Response**: `[ { _id, group_id, sender_id, text, createdAt } ]`

---

## 🛡 Security Middleware
All protected routes require an `Authorization` header:
`Authorization: Bearer <JWT_TOKEN>`
