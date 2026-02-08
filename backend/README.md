# Brothers Solar Backend API

## 📋 Overview

This is the backend API for the Brothers Solar website. It provides RESTful endpoints for managing solar orders, calculations, and admin functionality.

## 🚀 Features

- **Solar Types Management**: Get available solar panel types
- **Bill Calculator**: Calculate potential savings with solar
- **Solar Calculator**: Calculate system requirements
- **Order Management**: Create, update, and manage customer orders
- **Admin Dashboard**: Secure admin panel for order management
- **Authentication**: JWT-based admin authentication
- **Database Support**: MySQL with in-memory fallback
- **Multi-language Support**: Hindi, English, Marathi

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (optional, will use in-memory storage if not available)
- npm or yarn

### Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database Setup (Optional)**
   ```sql
   -- Import the database schema
   mysql -u root -p < database.sql
   ```

4. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Solar Types
- `GET /api/solar-types` - Get all solar panel types

### Calculators
- `POST /api/calculate-bill` - Calculate bill savings
- `POST /api/calculate-solar` - Calculate solar system requirements

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders (admin only)
- `PUT /api/orders/:orderId` - Update order status
- `DELETE /api/orders/:orderId` - Delete order

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/statistics` - Get order statistics

### Health Check
- `GET /api/health` - Server health check

## 🔒 Authentication

Admin endpoints use JWT authentication. Default admin credentials:
- **Username**: admin
- **Password**: admin123

## 📊 Database Schema

### Customers Table
- `id` - Primary key
- `order_id` - Unique order identifier
- `name` - Customer name
- `email` - Customer email
- `phone` - Customer phone
- `address` - Customer address
- `solar_type` - Selected solar panel type
- `quantity` - Number of panels
- `total_amount` - Order total
- `status` - Order status (pending/confirmed/completed)
- `payment_method` - Payment method (cod/online)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Admin Users Table
- `id` - Primary key
- `username` - Admin username
- `password` - Hashed password
- `email` - Admin email
- `created_at` - Creation timestamp

## 🌐 CORS Configuration

The API is configured to accept requests from:
- `http://localhost`
- `http://localhost:80`
- `http://localhost/brothers%20solar`

## 🔧 Environment Variables

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=brothers_solar
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost
```

## 🛡️ Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable origin whitelist
- **Input Validation**: Request validation and sanitization
- **Password Hashing**: bcrypt for secure password storage

## 📝 Example API Usage

### Get Solar Types
```bash
curl http://localhost:3000/api/solar-types
```

### Calculate Bill Savings
```bash
curl -X POST http://localhost:3000/api/calculate-bill \
  -H "Content-Type: application/json" \
  -d '{"monthlyBill": 5000, "unitsPerMonth": 200}'
```

### Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "address": "123 Main St",
    "solarType": "Basic Solar Panel",
    "solarTypeId": 1,
    "quantity": 2,
    "price": 15000,
    "totalAmount": 30000,
    "installationDate": "2024-02-15"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## 🔄 Fallback Mode

If MySQL database is not available, the API automatically switches to in-memory storage mode. This ensures the application works during development without database setup.

## 🧪 Testing

The API includes a health check endpoint for testing:
```bash
curl http://localhost:3000/api/health
```

## 📝 Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (in development)"
}
```

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure proper database credentials
4. Set up SSL/TLS
5. Configure reverse proxy (nginx/Apache)
6. Set up process manager (PM2)

## 📞 Support

For any issues or questions, please contact the development team.

---

**Brothers Solar** - Powering a Sustainable Future 🌞
