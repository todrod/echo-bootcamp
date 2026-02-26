# Echo Bootcamp

Private self-hosted study app for cardiac sonography at:
- `/echo-bootcamp/exam` (implemented)
- `/echo-bootcamp/calculators` (reserved)
- `/echo-bootcamp/ase` (reserved)

Stack:
- Next.js App Router + TypeScript + Tailwind
- Prisma ORM + MariaDB (MySQL provider)
- Cookie auth (username + PIN/password, bcrypt)

Exam tracks:
- `RSC` (Registered Cardiac Sonographer)
- `ACS` (Advanced Cardiac Sonographer, 300-question bank, includes multi-select items)

## Routes
All browser routes are under `basePath="/echo-bootcamp"`.

Implemented exam pages:
- `/echo-bootcamp/exam`
- `/echo-bootcamp/exam/login`
- `/echo-bootcamp/exam/practice/setup`
- `/echo-bootcamp/exam/full/setup`
- `/echo-bootcamp/exam/session/[attemptId]`
- `/echo-bootcamp/exam/results/[attemptId]`
- `/echo-bootcamp/exam/stats`
- `/echo-bootcamp/exam/admin`

API route handlers:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/attempts/in-progress`
- `POST /api/attempts/create`
- `POST /api/attempts/[id]/answer`
- `POST /api/attempts/[id]/finish`
- `GET /api/attempts/[id]/results`
- `GET /api/stats/summary`
- `POST /api/admin/import`
- `POST /api/admin/weights`
- `PATCH /api/admin/questions/[id]`

## 1) Create MariaDB DB + User
On VPS:

```sql
CREATE DATABASE echo_bootcamp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'echo_user'@'%' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON echo_bootcamp.* TO 'echo_user'@'%';
FLUSH PRIVILEGES;
```

## 2) Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://echo_user:strong_password_here@127.0.0.1:3306/echo_bootcamp"
SESSION_SECRET="longrandom"
BASE_URL="https://todrod.com"
NEXT_PUBLIC_BASE_PATH="/echo-bootcamp"
```

## 3) Prisma Migrate

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
```

## 4) Parse PDF into JSON
Expected source PDF:
- `/mnt/data/pdfcoffee.com-terry-reynolds-500-flash-cards-rcs-study-guide.pdf`
- fallback `/Users/todrod/Downloads/pdfcoffee.com-terry-reynolds-500-flash-cards-rcs-study-guide.pdf`

Install parser dependency once:

```bash
pip3 install pypdf
```

Run parse:

```bash
npm run import:pdf
```

This writes `data/questions.raw.json`.

ACS source PDF (default):
- `/Users/todrod/Downloads/ARCS Exam.pdf`

Run ACS parse:

```bash
npm run import:acs
```

This writes `data/acs_parsed_debug.json`.

## 5) Auto-tag + Load

```bash
npm run import:load
```

This writes `data/questions.tagged.json` and upserts records into MariaDB.

## 6) Start Dev

```bash
npm run dev
```

Visit:
- `http://localhost:3000/echo-bootcamp/exam/login`

## 7) Production Build + Start

```bash
npm run prod
```

Or explicitly:

```bash
npm run build
npm run start
```

PM2 example:

```bash
npm i -g pm2
pm2 start npm --name echo-bootcamp -- start
pm2 save
pm2 startup
```

## 8) Nginx reverse proxy for `/echo-bootcamp`

```nginx
server {
  listen 80;
  server_name todrod.com www.todrod.com;

  location /echo-bootcamp/ {
    proxy_pass http://127.0.0.1:3000/echo-bootcamp/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Admin Notes
- Users are created from login when `createIfMissing` is enabled.
- To grant admin access:

```sql
UPDATE User SET isAdmin = 1 WHERE username = 'your_username';
```

- Admin page can import tagged data, edit weights, and patch question metadata/explanations.
- Admin import now supports both tracks:
  - `Import RSC bank`
  - `Import ACS bank (300)`

## Import Pipeline Files
- `scripts/parse_pdf_to_json.py`
- `scripts/autotag_and_load.ts`
- `data/questions.raw.json` (generated)
- `data/questions.tagged.json` (generated)

## Base Path Safety
- `next.config.ts` sets `basePath="/echo-bootcamp"`.
- Client fetches use `NEXT_PUBLIC_BASE_PATH` helper (`src/lib/client.ts`) to resolve API URLs under base path.
