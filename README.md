# Team Access Control API

API Backend untuk manajemen akses kontrol tim (Multi-Tenant). Proyek ini dirancang untuk menangani organisasi, pengguna (users), peran (roles), dan izin (permissions) menggunakan Role-Based Access Control (RBAC) dengan dukungan Attribute-Based Access Control (ABAC) yang fleksibel.

## 🚀 Fitur Utama
- **Multi-Tenancy:** Mendukung banyak organisasi/workspace dalam satu sistem.
- **Autentikasi & Otorisasi:** JWT-based authentication dengan *Refresh Token* dan manajemen sesi.
- **RBAC & ABAC:** Sistem manajemen *Role* dan *Permission* yang mendetail hingga ke tingkat kondisi resource (JSON).
- **Undangan Tim:** Mengundang pengguna baru bergabung ke organisasi melalui email.
- **Audit Logging:** Pencatatan (observability) untuk setiap tindakan krusial (login, ganti role, dll).
- **API Keys:** Mendukung pembuatan API key per organisasi untuk akses *Machine-to-Machine* (M2M).
- **Keamanan:** Proteksi via Helmet, CORS, dan *Rate Limiting* berbasis Redis.

## 🛠️ Tech Stack
- **Framework:** [Express.js](https://expressjs.com/) (Node.js) + TypeScript
- **Database:** PostgreSQL
- **ORM:** [Prisma](https://www.prisma.io/)
- **Caching & Rate Limiting:** Redis
- **Validasi Data:** [Zod](https://zod.dev/)
- **Testing:** Jest & Supertest
- **Dokumentasi API:** Swagger (OpenAPI)
- **Containerization:** Docker & Docker Compose

## 📋 Persyaratan Sistem
Pastikan Anda sudah menginstal aplikasi berikut di perangkat Anda:
- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

## ⚙️ Cara Menjalankan Proyek Secara Lokal

### 1. Clone Repository
```bash
git clone https://github.com/AhmadSPriaji/team-access-control-api.git
cd team-access-control-api
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin konfigurasi `.env` Anda (buat file `.env` baru berdasarkan format di bawah ini):
```env
# Database (Disesuaikan dengan docker-compose.yml)
DATABASE_URL="postgresql://admin:ahmadsiddiq@localhost:5432/team_access_db?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Server Port
PORT=3000

# JWT Secrets
JWT_SECRET="super-secret-key-untuk-akses-token"
JWT_REFRESH_SECRET="super-secret-key-untuk-refresh-token"

# Email SMTP (Untuk undangan tim)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-pass"
```

### 4. Jalankan Database & Redis
Proyek ini menggunakan Docker Compose untuk menyiapkan PostgreSQL dan Redis secara cepat.
```bash
docker-compose up -d
```
Tunggu beberapa saat sampai container menyala sempurna.

### 5. Setup Database (Migrasi & Seeding)
Jalankan migrasi Prisma untuk membuat tabel di database:
```bash
npx prisma migrate dev
```
*(Opsional) Jalankan script seeding untuk permission default:*
```bash
npx tsx src/scripts/seedPermissions.ts
```

### 6. Jalankan Server Development
```bash
npm run dev
```
Server akan berjalan secara default di `http://localhost:3000`.

## 📚 Dokumentasi API (Swagger)
Aplikasi ini dilengkapi dengan dokumentasi API interaktif dari Swagger.
Setelah server berjalan, buka URL berikut di browser Anda:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

Anda juga bisa melakukan pengujian menggunakan koleksi Postman yang telah disediakan di file `postman_collection.json`.

## 🧪 Testing
Proyek ini menggunakan **Jest** untuk integrasi dan unit testing. Pastikan Anda memiliki konfigurasi `.env.test` untuk menunjuk ke database testing yang terpisah.

Untuk menjalankan pengujian:
```bash
npm run test
```

## 🏗️ Struktur Skema Database
- **User:** Entitas pengguna dengan kredensial (email, password).
- **Organization:** Tenant/Workspace.
- **Project:** Sumber daya yang berada di bawah sebuah organisasi.
- **Role & Permission:** RBAC custom per organisasi.
- **Membership:** Menghubungkan User ke Organization dengan Role tertentu.
- **Session:** Menyimpan *Refresh Token* yang aktif.
- **AuditLog:** Mencatat aktivitas keamanan dan modifikasi data krusial.
- **ApiKey:** Mengelola kunci API statis untuk keperluan integrasi sistem luar.

## 📝 Script Utama
- `npm run dev`: Menjalankan server dalam mode pengembangan.
- `npm run build`: Melakukan kompilasi kode TypeScript ke folder `dist/`.
- `npm start`: Menjalankan aplikasi versi produksi dari hasil build `dist/`.
- `npm test`: Menjalankan skrip testing menggunakan Jest.

---
*Dikembangkan oleh AhmadSPriaji.*
