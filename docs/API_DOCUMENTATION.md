# BillDesk — REST API Specifications

The Hono backend exposes JSON endpoints for authentication, master records management, invoicing, payments, and reporting. All endpoints are base-pathed to `/api` and require a valid Bearer Token inside the `Authorization` header (except auth login/register).

---

## 🔒 1. Authentication (`/api/auth`)

### POST `/api/auth/register`
Creates a new tenant Shop and registers the primary Owner user.
- **Payload:**
  ```json
  {
    "email": "owner@shop.com",
    "passwordHash": "$2b$10$hashedPassword",
    "name": "John Doe",
    "mobile": "9876543210",
    "shopName": "John's Groceries",
    "businessType": "Retailer"
  }
  ```
- **Response:** `201 Created`

### POST `/api/auth/login`
Validates credentials and returns access and refresh tokens.
- **Payload:**
  ```json
  {
    "email": "owner@shop.com",
    "passwordHash": "$2b$10$hashedPassword"
  }
  ```
- **Response:** `200 OK` (includes `accessToken`, `refreshToken`, and user payload)

---

## 👥 2. Customers & Buyers (`/api/customers` / `/api/buyers`)

All write and update operations validate tenant ownership to prevent ID enumeration.

### GET `/api/customers`
Retrieves a paginated list of customers under the logged-in shop context.
- **Query Params:** `search`, `page`, `pageSize`

### POST `/api/customers`
Creates a customer.
- **Payload:** `customerName`, `mobile`, `email`, `address`, `gstNumber`, `openingBalance`, `creditLimit`, `notes`

### PUT `/api/customers/:id`
Updates details.
- **Payload:** Partial Customer attributes.

---

## 📋 3. Invoices (`/api/invoices`)

### POST `/api/invoices`
Saves an invoice, computes totals, updates outstanding status, and records item logs.
- **Payload:**
  ```json
  {
    "customerId": "cust-uuid",
    "buyerId": "buyer-uuid",
    "date": "2026-07-03T00:00:00Z",
    "dueDate": "2026-08-03T00:00:00Z",
    "transportCharge": 150.00,
    "packingCharge": 50.00,
    "otherCharge": 0.00,
    "advancePayment": 200.00,
    "notes": "Thank you!",
    "items": [
      {
        "productName": "Wheat Flour Bag",
        "description": "Premium Quality",
        "quantity": 10,
        "unit": "bag",
        "price": 450.00,
        "taxRate": 5,
        "discount": 50.00
      }
    ]
  }
  ```
