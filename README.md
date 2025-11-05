# 🌊 Water Level Dashboard - Kolok Basin

ระบบติดตามและแสดงผลข้อมูลระดับน้ำในลุ่มน้ำโก-ลก (Kolok Basin Water Level Monitoring Dashboard)

## 📋 คุณสมบัติ (Features)

- 📊 แสดงข้อมูลระดับน้ำแบบเรียลไทม์จาก 3 สถานีตรวจวัด
- 📈 กราฟแสดงแนวโน้มระดับน้ำตามช่วงเวลา
- ⚠️ ระบบแจ้งเตือนเมื่อระดับน้ำใกล้หรือเกินระดับตลิ่ง
- 📍 แสดงตำแหน่งและข้อมูลสถานีตรวจวัด
- 📉 สถิติระดับน้ำ (ต่ำสุด, สูงสุด, เฉลี่ย)
- 🎨 UI ที่สวยงามและใช้งานง่าย
- 🐳 รองรับ Docker สำหรับการติดตั้งที่ง่ายดาย

## 🏗️ สถาปัตยกรรม (Architecture)

โปรเจคประกอบด้วย 3 ส่วนหลัก:

1. **Frontend**: React.js พร้อม Recharts สำหรับแสดงกราฟ
2. **Backend**: Node.js + Express.js REST API
3. **Database**: MySQL 8.0

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend
- React 18
- Recharts (สำหรับกราฟ)
- Axios (HTTP client)
- CSS3 (Responsive design)

### Backend
- Node.js
- Express.js
- MySQL2 (Database driver)
- CORS
- dotenv

### Database
- MySQL 8.0

### DevOps
- Docker
- Docker Compose

## 📦 ข้อมูล (Data)

โปรเจคใช้ข้อมูลระดับน้ำจาก 3 สถานีตรวจวัด:

| สถานี | ละติจูด | ลองจิจูด | ระดับตลิ่ง (ม.) | ลุ่มน้ำ |
|-------|---------|----------|----------------|---------|
| X.274 | 5.839205 | 101.892307 | 23.5 | kolok |
| X.119A | 6.023349 | 101.975655 | 9.3 | kolok |
| X.119 | 6.074279 | 102.040062 | 7.0 | kolok |

## 🚀 การติดตั้งและเริ่มใช้งาน (Installation & Setup)

### ข้อกำหนดเบื้องต้น (Prerequisites)

- Docker และ Docker Compose ติดตั้งในเครื่อง
- หรือ Node.js (v18+) และ MySQL (หากไม่ใช้ Docker)

### วิธีที่ 1: ใช้ Docker (แนะนำ)

1. **Clone หรือไปยัง directory ของโปรเจค**
```powershell
cd c:\Users\phakk\Desktop\project\waterdashboard
```

2. **เตรียมข้อมูล SQL**

โปรเจคจะโหลดข้อมูลจากไฟล์ `init-mysql.sql` โดยอัตโนมัติ หากต้องการใช้ข้อมูลทั้งหมดจาก `kolok_waterlevel.sql` สามารถแก้ไข `docker-compose.yml` ได้:

```yaml
volumes:
  - ./kolok_waterlevel.sql:/docker-entrypoint-initdb.d/init.sql
```

3. **สร้างและเริ่มต้น containers**
```powershell
docker-compose up -d
```

4. **รอให้ services พร้อมใช้งาน** (ประมาณ 30-60 วินาที)

5. **เปิดเว็บเบราว์เซอร์**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### วิธีที่ 2: ติดตั้งแบบแยกส่วน (Manual Setup)

#### 1. ตั้งค่า MySQL Database

```powershell
# เชื่อมต่อ MySQL และสร้าง database
mysql -u root -p
```

```sql
CREATE DATABASE waterlevel_db;
USE waterlevel_db;
SOURCE c:/Users/phakk/Desktop/project/waterdashboard/init-mysql.sql;
```

#### 2. ตั้งค่า Backend

```powershell
cd backend
npm install
```

สร้างไฟล์ `.env` ใน folder backend:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=waterlevel_db
PORT=5000
```

เริ่มต้น backend:
```powershell
npm start
```

#### 3. ตั้งค่า Frontend

```powershell
cd frontend
npm install
```

สร้างไฟล์ `.env` ใน folder frontend:
```
REACT_APP_API_URL=http://localhost:5000
```

เริ่มต้น frontend:
```powershell
npm start
```

## 📡 API Endpoints

Backend API มี endpoints ดังนี้:

### Health Check
```
GET /api/health
```

### Metadata
```
GET /api/metadata
```
ดึงข้อมูลสถานีทั้งหมด

### Water Level Data
```
GET /api/waterlevel
```
Query parameters:
- `page` (default: 1)
- `limit` (default: 100)
- `start_date` (optional)
- `end_date` (optional)

### Latest Water Level
```
GET /api/waterlevel/latest
```
ดึงข้อมูลระดับน้ำล่าสุด

### Statistics
```
GET /api/statistics/:station
```
ดึงสถิติของสถานี (min, max, avg)
Example: `/api/statistics/274`

### Chart Data
```
GET /api/waterlevel/chart
```
Query parameters:
- `start_date` (required)
- `end_date` (required)
- `aggregation` (day/month/year, default: month)

### Alerts
```
GET /api/alerts
```
ดึงข้อมูลการแจ้งเตือนเมื่อระดับน้ำ >= 80% ของระดับตลิ่ง

## 🎨 หน้าจอแสดงผล (UI Screenshots)

Dashboard แสดง:
- 📊 กราฟเส้นแสดงระดับน้ำตามเวลา
- 📋 การ์ดข้อมูลแต่ละสถานี
- ⚠️ แจ้งเตือนเมื่อระดับน้ำสูง
- 📈 สถิติและข้อมูลวิเคราะห์

## 🔧 การจัดการ Docker

### ดู logs
```powershell
docker-compose logs -f
```

### ดู logs เฉพาะ service
```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### หยุด services
```powershell
docker-compose down
```

### หยุดและลบ volumes (ข้อมูลทั้งหมด)
```powershell
docker-compose down -v
```

### เริ่มต้นใหม่
```powershell
docker-compose restart
```

### Rebuild containers
```powershell
docker-compose up -d --build
```

## 📊 โครงสร้างโปรเจค (Project Structure)

```
waterdashboard/
├── docker-compose.yml          # Docker orchestration
├── .env                        # Environment variables
├── .gitignore                  # Git ignore file
├── README.md                   # This file
├── init-mysql.sql              # MySQL initialization script
├── kolok_waterlevel.sql        # Original data (optional)
├── metadata_kolok_waterlevel.csv
├── waterlevel_data.csv
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js              # Express.js server
│   └── .dockerignore
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── .dockerignore
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js             # Main application
        ├── App.css
        └── components/
            ├── StationCard.js      # Station info card
            ├── WaterLevelChart.js  # Chart component
            ├── AlertsPanel.js      # Alerts display
            └── Statistics.js       # Statistics display
```

## 🔒 ความปลอดภัย (Security Notes)

⚠️ **สำคัญ**: โปรเจคนี้เป็น demo และมีการใช้ credentials ที่ง่าย สำหรับ production ควร:

1. เปลี่ยนรหัสผ่าน MySQL
2. ใช้ environment variables ที่ปลอดภัย
3. ใช้ HTTPS
4. เพิ่ม authentication/authorization
5. เพิ่ม input validation และ sanitization

## 🐛 การแก้ไขปัญหา (Troubleshooting)

### Backend ไม่สามารถเชื่อมต่อ MySQL
- รอให้ MySQL เริ่มต้นเสร็จก่อน (ใช้ healthcheck)
- ตรวจสอบ credentials ใน `.env`

### Frontend ไม่สามารถเชื่อมต่อ Backend
- ตรวจสอบว่า backend กำลังทำงาน: `docker-compose logs backend`
- ตรวจสอบ `REACT_APP_API_URL` ใน `.env`

### Port ถูกใช้งานแล้ว
- เปลี่ยน port ใน `docker-compose.yml`
- หรือหยุด services ที่ใช้ port เดียวกัน

### ข้อมูลไม่แสดง
- ตรวจสอบว่า MySQL มีข้อมูล: `docker-compose exec mysql mysql -u wateruser -p waterlevel_db`
- รัน SQL: `SELECT COUNT(*) FROM waterlevel_data;`

## 🔄 การอัปเดตข้อมูล (Updating Data)

หากต้องการเพิ่มข้อมูลใหม่:

```powershell
# เชื่อมต่อ MySQL container
docker-compose exec mysql mysql -u wateruser -p waterlevel_db

# Import ข้อมูลใหม่
SOURCE /path/to/new_data.sql;
```

## 📝 License

MIT License - ใช้งานได้อย่างอิสระ

## 👥 ผู้พัฒนา (Developer)

สร้างโดย GitHub Copilot สำหรับโปรเจค Water Level Monitoring Dashboard

## 🙏 Credits

- ข้อมูลระดับน้ำจากลุ่มน้ำโก-ลก
- Recharts library สำหรับการแสดงกราฟ
- React และ Node.js community

---

## 🚦 Quick Start Commands

```powershell
# เริ่มต้นทั้งระบบ
docker-compose up -d

# ดู logs
docker-compose logs -f

# หยุดระบบ
docker-compose down

# เริ่มต้นใหม่พร้อม rebuild
docker-compose up -d --build

# เข้าดูข้อมูลใน MySQL
docker-compose exec mysql mysql -u wateruser -pwaterpass waterlevel_db
```

## 📞 Support

หากพบปัญหาหรือมีคำถาม:
1. ตรวจสอบ logs: `docker-compose logs`
2. ตรวจสอบ API health: http://localhost:5000/api/health
3. ตรวจสอบ browser console สำหรับ frontend errors

---

**Happy Monitoring! 🌊📊**
