# 🚀 Quick Reference Guide
# คู่มือใช้งานอย่างรวดเร็ว

## การเริ่มต้นใช้งาน (Quick Start)

### 1. เริ่มต้นระบบ (Start System)
```powershell
# วิธีที่ 1: ใช้ script
.\setup.ps1

# วิธีที่ 2: ใช้ docker-compose โดยตรง
docker-compose up -d
```

### 2. เข้าใช้งาน (Access)
- Dashboard: http://localhost:3000
- API: http://localhost:5000
- API Health: http://localhost:5000/api/health

### 3. หยุดระบบ (Stop System)
```powershell
docker-compose down
```

---

## คำสั่งที่ใช้บ่อย (Common Commands)

### Docker Commands

```powershell
# ดู status ของ containers
docker-compose ps

# ดู logs ทั้งหมด
docker-compose logs -f

# ดู logs เฉพาะ service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Restart service
docker-compose restart backend

# Rebuild และ restart
docker-compose up -d --build

# หยุดและลบทุกอย่าง (รวมข้อมูล)
docker-compose down -v

# เข้าไปใน container
docker-compose exec mysql bash
docker-compose exec backend sh
```

### MySQL Commands

```powershell
# เข้า MySQL
docker-compose exec mysql mysql -u wateruser -pwaterpass waterlevel_db

# ใน MySQL shell:
SHOW TABLES;
SELECT COUNT(*) FROM waterlevel_data;
SELECT * FROM metadata_kolok_waterlevel;
SELECT * FROM waterlevel_data ORDER BY date_time DESC LIMIT 10;
```

### API Testing

```powershell
# ใช้ PowerShell script
.\test-api.ps1

# ใช้ curl
curl http://localhost:5000/api/health
curl http://localhost:5000/api/metadata
curl http://localhost:5000/api/waterlevel/latest
curl http://localhost:5000/api/alerts
```

---

## โครงสร้างโปรเจค (Project Structure)

```
waterdashboard/
├── 📄 README.md              - เอกสารหลัก
├── 📄 QUICKSTART.md          - คู่มือนี้
├── 📄 docker-compose.yml     - Docker configuration
├── 📄 .env                   - Environment variables
├── 📄 setup.ps1              - Setup script
├── 📄 test-api.ps1           - API testing script
├── 📄 convert_sql.py         - SQL converter
├── 📄 init-mysql.sql         - MySQL init script
├── 📄 kolok_waterlevel.sql   - Original data
│
├── 📁 backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js             - Express API server
│
└── 📁 frontend/
    ├── Dockerfile
    ├── package.json
    ├── src/
    │   ├── App.js            - Main app
    │   ├── index.js
    │   ├── index.css
    │   └── components/       - React components
    └── public/
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | ตรวจสอบสถานะ server |
| `/api/metadata` | GET | ข้อมูลสถานี |
| `/api/waterlevel` | GET | ข้อมูลระดับน้ำ (pagination) |
| `/api/waterlevel/latest` | GET | ข้อมูลล่าสุด |
| `/api/waterlevel/chart` | GET | ข้อมูลสำหรับกราฟ |
| `/api/statistics/:station` | GET | สถิติของสถานี |
| `/api/alerts` | GET | การแจ้งเตือน |

---

## การแก้ไขปัญหา (Troubleshooting)

### ❌ Port ถูกใช้งานแล้ว

```powershell
# ดู process ที่ใช้ port
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :3306

# หยุด process (ใช้ PID จากคำสั่งด้านบน)
taskkill /PID <PID> /F
```

### ❌ Container ไม่ start

```powershell
# ดู logs เพื่อหาสาเหตุ
docker-compose logs

# ลอง rebuild
docker-compose down
docker-compose up -d --build
```

### ❌ Database ไม่มีข้อมูล

```powershell
# เข้า MySQL และตรวจสอบ
docker-compose exec mysql mysql -u wateruser -pwaterpass waterlevel_db

# ใน MySQL:
SELECT COUNT(*) FROM waterlevel_data;

# ถ้าไม่มีข้อมูล ให้ import ใหม่:
SOURCE /docker-entrypoint-initdb.d/init.sql;
```

### ❌ Frontend ไม่แสดงข้อมูล

1. ตรวจสอบ Backend: http://localhost:5000/api/health
2. ตรวจสอบ Browser Console (F12)
3. ตรวจสอบ REACT_APP_API_URL
4. ตรวจสอบ CORS settings

---

## การอัปเดตโค้ด (Update Code)

### อัปเดต Backend

```powershell
# แก้ไข server.js
# จากนั้น restart
docker-compose restart backend
```

### อัปเดต Frontend

```powershell
# แก้ไขไฟล์ใน src/
# React จะ auto-reload
# หรือ restart manual:
docker-compose restart frontend
```

### อัปเดต Dependencies

```powershell
# Backend
cd backend
npm install <package-name>
docker-compose up -d --build backend

# Frontend
cd frontend
npm install <package-name>
docker-compose up -d --build frontend
```

---

## Performance Tips

1. **Production Build**
```powershell
# Frontend production build
cd frontend
npm run build
```

2. **Database Indexing**
- Tables already have indexes on primary keys and date_time
- Add more indexes if needed for specific queries

3. **Caching**
- Consider adding Redis for caching API responses
- Cache expensive queries

---

## Security Checklist

For Production Deployment:

- [ ] เปลี่ยนรหัสผ่าน MySQL
- [ ] ใช้ HTTPS
- [ ] เพิ่ม authentication
- [ ] เพิ่ม rate limiting
- [ ] ใช้ environment variables ที่ปลอดภัย
- [ ] Enable CORS เฉพาะ domains ที่ต้องการ
- [ ] Backup database เป็นประจำ
- [ ] Update dependencies เป็นประจำ

---

## Monitoring

```powershell
# ดู resource usage
docker stats

# ดู disk usage
docker system df

# Cleanup unused images/containers
docker system prune
```

---

## Backup & Restore

### Backup Database

```powershell
# Export database
docker-compose exec mysql mysqldump -u wateruser -pwaterpass waterlevel_db > backup.sql
```

### Restore Database

```powershell
# Import database
docker-compose exec -T mysql mysql -u wateruser -pwaterpass waterlevel_db < backup.sql
```

---

## Contact & Support

- 📖 ดูเอกสารเพิ่มเติม: README.md
- 🐛 Bug reports: GitHub Issues
- 💡 Feature requests: GitHub Issues

---

## Useful Links

- Docker Documentation: https://docs.docker.com
- React Documentation: https://react.dev
- Express Documentation: https://expressjs.com
- MySQL Documentation: https://dev.mysql.com/doc
- Recharts Documentation: https://recharts.org

---

**สร้างโดย GitHub Copilot 🤖**
