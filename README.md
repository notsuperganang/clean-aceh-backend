# CleanAceh Backend

Backend API untuk aplikasi mobile CleanAceh - platform pemesanan jasa pembersih rumah di Aceh.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT
- **Validation**: Joi
- **Password Hashing**: bcryptjs

## 📋 Prerequisites

- Node.js (v16 atau lebih baru)
- npm atau yarn
- Akun Supabase
- Git

## ⚙️ Setup & Installation

### 1. Clone Repository

```bash
git clone https://github.com/notsuperganang/clean-aceh-backend.git
cd clean-aceh-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di root directory dan isi dengan konfigurasi berikut:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_please_change_this_in_production
JWT_EXPIRES_IN=24h

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 4. Setup Supabase Database

1. Buka Supabase Dashboard
2. Buat project baru atau gunakan yang sudah ada
3. Buka SQL Editor
4. Copy dan jalankan isi file `src/config/schema.sql`
5. Pastikan semua tabel berhasil dibuat

### 5. Mendapatkan Supabase Credentials

#### Supabase URL dan Anon Key:
1. Buka project Supabase Anda
2. Pergi ke Settings → API
3. Copy `Project URL` untuk `SUPABASE_URL`
4. Copy `anon/public` key untuk `SUPABASE_ANON_KEY`

#### Service Role Key:
1. Di halaman yang sama (Settings → API)
2. Copy `service_role` key untuk `SUPABASE_SERVICE_ROLE_KEY`
3. ⚠️ **PENTING**: Jangan expose service role key di frontend!

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Server akan berjalan di `http://localhost:3000` (atau port yang Anda tentukan di .env)

## 📡 API Endpoints

### Health Check
```
GET /health
```

### API Base URL
```
/api/v1
```

### Available Endpoints (akan dikembangkan)
- `/api/v1/auth` - Authentication endpoints
- `/api/v1/users` - User management
- `/api/v1/services` - Service management
- `/api/v1/cleaners` - Cleaner profiles
- `/api/v1/orders` - Order management
- `/api/v1/reviews` - Review and rating
- `/api/v1/payments` - Payment handling

## 🗄️ Database Schema

Database terdiri dari tabel-tabel berikut:

### Core Tables
- `users` - User accounts (customers, cleaners, admin)
- `user_addresses` - User saved addresses
- `payment_methods` - User payment methods
- `services` - Available cleaning services
- `cleaner_profiles` - Cleaner professional profiles
- `cleaner_schedules` - Cleaner working schedules

### Business Logic Tables
- `orders` - Service orders/bookings
- `order_status_history` - Order status tracking
- `payments` - Payment transactions
- `reviews` - Customer reviews and ratings

### Communication Tables
- `conversations` - Chat conversations
- `messages` - Chat messages
- `notifications` - User notifications

### Marketing Tables
- `promotions` - Discount promotions
- `user_promotions` - User promotion usage tracking

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | ✅ | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ | - |
| `PORT` | Server port | ❌ | 3000 |
| `NODE_ENV` | Environment mode | ❌ | development |
| `JWT_SECRET` | JWT signing secret | ✅ | - |
| `JWT_EXPIRES_IN` | JWT expiration time | ❌ | 24h |
| `FRONTEND_URL` | Frontend URL for CORS | ❌ | * |

## 📁 Project Structure

```
clean-aceh-backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Database connection
│   │   └── schema.sql       # Database schema
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Express middleware
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   │   ├── response.js     # Response helpers
│   │   └── validateEnv.js  # Environment validation
│   └── validators/         # Input validation schemas
├── .env                    # Environment variables
├── .gitignore             # Git ignore file
├── package.json           # Project dependencies
├── README.md              # Project documentation
└── server.js              # Application entry point
```

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (minimum 32 characters)
3. Configure proper CORS settings
4. Set up SSL/HTTPS

### Deployment Platforms
- **Heroku**: Siap deploy dengan Procfile
- **Vercel**: Serverless deployment
- **Railway**: Modern deployment platform
- **DigitalOcean App Platform**: Container deployment

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Troubleshooting

### Common Issues

**1. Database Connection Failed**
- Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY benar
- Cek koneksi internet
- Pastikan project Supabase aktif

**2. JWT Secret Error**
- Pastikan JWT_SECRET minimal 32 karakter
- Jangan gunakan secret yang mudah ditebak

**3. CORS Issues**
- Set FRONTEND_URL sesuai domain frontend Anda
- Untuk development, bisa gunakan '*'

**4. Port Already in Use**
- Ganti PORT di .env file
- Atau kill process yang menggunakan port tersebut

### Support

Jika mengalami masalah, silakan buat issue di repository ini atau hubungi tim development.

---

## 📊 API Response Format

Semua API response menggunakan format standar:

### Success Response
```json
{
  "status": "success",
  "message": "Success message",
  "data": {}, // atau array
  "timestamp": "2024-01-01T00:00:00.000Z",
  "meta": {} // opsional, untuk pagination dll
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "errors": {} // opsional, detail error
}
```

Happy coding! 🎉