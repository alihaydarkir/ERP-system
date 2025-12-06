# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "user"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### POST /auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "role": "user"
  }
}
```

## Products

### GET /products
Get all products.

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU001",
      "price": 99.99,
      "stock_quantity": 100
    }
  ]
}
```

### GET /products/:id
Get a specific product.

### POST /products
Create a new product.

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Description",
  "sku": "NEW001",
  "category": "Electronics",
  "price": 149.99,
  "stock_quantity": 50,
  "reorder_level": 10
}
```

### PUT /products/:id
Update a product.

### DELETE /products/:id
Delete a product.

## Orders

### GET /orders
Get all orders.

### GET /orders/:id
Get a specific order.

### POST /orders
Create a new order.

### PUT /orders/:id
Update an order.

### DELETE /orders/:id
Delete an order.

## Chat

### POST /chat/message
Send a message to the AI chatbot.

**Request Body:**
```json
{
  "message": "What products are low in stock?"
}
```

### GET /chat/history
Get chat history.

## Reports

### GET /reports/daily
Get daily report.

### GET /reports/weekly
Get weekly report.

### GET /reports/monthly
Get monthly report.

