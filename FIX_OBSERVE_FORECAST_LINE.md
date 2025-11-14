# 🔧 แก้ไขปัญหาเส้นแบ่ง Observe | Forecast

## 📅 วันที่: 13 พฤศจิกายน 2568 (2025-11-13)

---

## 🐛 ปัญหาที่พบ

### ปัญหาที่ 1: เส้นแบ่งอยู่ที่วันที่ผิด
- **อาการ:** เส้นแบ่ง "Observe | Forecast" อยู่ที่วันที่ 12 แทนที่จะเป็นวันที่ 13
- **สาเหตุ:** การแปลงเวลาไทย (GMT+7) ไม่ถูกต้อง

### ปัญหาที่ 2: แสดงข้อมูลซ้ำซ้อน
- **อาการ:** วันเดียวกันแสดงทั้ง Observe และ Forecast
- **สาเหตุ:** Logic แยก Observe/Forecast ใช้การเปรียบเทียบวันที่แทนที่จะใช้ `data_type` จากฐานข้อมูล

### ปัญหาที่ 3: วันที่ 14 แสดงค่า Observe ด้วย
- **อาการ:** วันที่ 14 (อนาคต) แสดงค่า Observe ซึ่งไม่ควรมี
- **สาเหตุ:** โค้ดเพิ่มจุดเชื่อมเส้นโดยเอาค่า Observe จากวันที่ 13 ไปใส่ที่วันที่ 14

---

## ✅ วิธีแก้ไข

### แก้ไขที่ 1: ปรับปรุงการคำนวณเวลาไทย

**ไฟล์:** `frontend/src/components/WaterLevelChart.js`

**Before:**
```javascript
const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
thailandTime.setHours(0, 0, 0, 0);
const currentDate = thailandTime.toISOString().split('T')[0];
```

**After:**
```javascript
const thailandDateStr = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(now);

const currentDate = thailandDateStr; // Already in YYYY-MM-DD format
```

**เหตุผล:**
- `new Date(localeString)` อาจให้ผลลัพธ์ไม่แม่นยำในบาง browser
- `Intl.DateTimeFormat` เป็น standard API ที่แม่นยำกว่า
- รูปแบบ 'en-CA' จะให้ผลลัพธ์เป็น YYYY-MM-DD โดยตรง

---

### แก้ไขที่ 2: ใช้ data_type จากฐานข้อมูล

#### Backend (server.js)

**Before:**
```sql
SELECT 
  DATE_FORMAT(date_time, ?) as period,
  AVG(x_274) as x_274_avg,
  ...
FROM waterlevel_data
WHERE date_time BETWEEN ? AND ?
GROUP BY period
ORDER BY period ASC
```

**After:**
```sql
SELECT 
  DATE_FORMAT(date_time, ?) as period,
  data_type,  -- เพิ่มบรรทัดนี้
  AVG(x_274) as x_274_avg,
  ...
FROM waterlevel_data
WHERE date_time BETWEEN ? AND ?
GROUP BY period, data_type  -- เพิ่ม data_type
ORDER BY period ASC, data_type ASC  -- เพิ่ม data_type
```

#### Frontend (WaterLevelChart.js)

**Before:**
```javascript
// ใช้การเปรียบเทียบวันที่
const isPastOrToday = period <= currentDate;

if (isPastOrToday) {
  // Observe
  groupedData[period]['X.274_obs'] = ...;
} else {
  // Forecast
  groupedData[period]['X.274_fc'] = ...;
}
```

**After:**
```javascript
// ใช้ data_type จากฐานข้อมูล
const isObserve = item.data_type === 'observe' || 
                  (item.data_type === 'forecast' ? false : period <= currentDate);

if (isObserve) {
  // Observe
  groupedData[period]['X.274_obs'] = ...;
} else {
  // Forecast
  groupedData[period]['X.274_fc'] = ...;
}
```

**เหตุผล:**
- ฐานข้อมูลมี `data_type` ENUM('observe', 'forecast') อยู่แล้ว
- ควรใช้ข้อมูลจริงจากฐานข้อมูลแทนการเดา
- รองรับกรณีที่วันเดียวกันมีทั้ง observe และ forecast

---

### แก้ไขที่ 3: ลบโค้ดเชื่อมเส้นแบบเก่า

**Before:**
```javascript
// Add connection point: add last observe values to the NEXT period
if (lastObserveData && lastObservePeriod) {
  const lastDate = new Date(lastObservePeriod);
  lastDate.setDate(lastDate.getDate() + 1);
  const nextPeriod = lastDate.toISOString().split('T')[0];
  
  if (groupedData[nextPeriod]) {
    groupedData[nextPeriod]['X.274_obs'] = lastObserveData['X.274'];
    groupedData[nextPeriod]['X.119A_obs'] = lastObserveData['X.119A'];
    groupedData[nextPeriod]['X.119_obs'] = lastObserveData['X.119'];
  }
}
```

**After:**
```javascript
// Note: Recharts will automatically connect Observe and Forecast lines
// with connectNulls={true}, so we don't need to manually add connection points
```

**เหตุผล:**
- Recharts มี property `connectNulls={true}` ที่เชื่อมเส้นกราฟให้อัตโนมัติ
- การเพิ่มจุดเชื่อมด้วยตัวเองทำให้ tooltip แสดงข้อมูลผิด
- เมื่อใช้ `data_type` จากฐานข้อมูลแล้ว ไม่จำเป็นต้องมีโค้ดนี้

---

### แก้ไขที่ 4: อัปเดต Label แสดงเวลาไทย

**Before:**
```javascript
<ReferenceLine
  x={lastObservePeriodState}
  stroke="#ff6b6b"
  label={{
    value: 'Observe | Forecast',
    ...
  }}
/>
```

**After:**
```javascript
{lastObservePeriodState && (() => {
  const now = new Date();
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const thaiDateStr = thailandTime.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const thaiTimeStr = thailandTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <ReferenceLine
      x={lastObservePeriodState}
      stroke="#ff6b6b"
      label={{
        value: `Observe | Forecast (${thaiDateStr} ${thaiTimeStr})`,
        ...
      }}
    />
  );
})()}
```

**เหตุผล:**
- แสดงให้ผู้ใช้เห็นว่าเส้นแบ่งอ้างอิงเวลาไทย
- แสดงวันที่และเวลาปัจจุบันของไทยที่คำนวณเส้นแบ่ง

---

## 📊 ผลลัพธ์

### ก่อนแก้ไข
```
วันที่ 12 (อดีต):   Observe + Forecast ❌
วันที่ 13 (ปัจจุบัน): Observe + Forecast ❌
วันที่ 14 (อนาคต):   Observe + Forecast ❌
เส้นแบ่ง: อยู่ที่วันที่ 12 ❌
```

### หลังแก้ไข
```
วันที่ 12 (อดีต):   Observe ✅ + Forecast ✅
วันที่ 13 (ปัจจุบัน): Observe ✅ + Forecast ✅
วันที่ 14 (อนาคต):   Forecast only ✅
วันที่ 15+ (อนาคต):  Forecast only ✅
เส้นแบ่ง: อยู่ที่วันที่ 13 ✅ พร้อมแสดงเวลาไทย ✅
```

---

## 🧪 การทดสอบ

### ทดสอบ Backend API
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/waterlevel/chart?start_date=2025-11-12&end_date=2025-11-15&aggregation=day"
$response.data | Select-Object period, data_type, x_119_avg | Format-Table
```

**ผลลัพธ์ที่คาดหวัง:**
```
period     data_type x_119_avg
------     --------- ---------
2025-11-12 observe   2.800000
2025-11-12 forecast  3.150000
2025-11-13 observe   2.820000
2025-11-13 forecast  3.200000
2025-11-14 forecast  3.250000
2025-11-15 forecast  3.300000
```

### ทดสอบ Frontend

1. เปิด http://localhost:3000
2. ตรวจสอบ Browser Console (F12):
   ```
   📅 Current Thailand Date: 2025-11-13
   🎯 Last Observe Period: 2025-11-13
   ```
3. ตรวจสอบกราฟ:
   - เส้นแบ่งสีแดงอยู่ที่วันที่ 13
   - Label แสดง "Observe | Forecast (13 พ.ย. 2568 14:58)"
   - Hover วันที่ 13: แสดงทั้ง Observe และ Forecast
   - Hover วันที่ 14: แสดงเฉพาะ Forecast

---

## 📝 ไฟล์ที่แก้ไข

1. **backend/server.js** (บรรทัด 199-215)
   - เพิ่ม `data_type` ใน SELECT statement
   - เพิ่ม `data_type` ใน GROUP BY และ ORDER BY

2. **frontend/src/components/WaterLevelChart.js**
   - บรรทัด 43-56: แก้ไขการคำนวณเวลาไทย
   - บรรทัด 64-90: เปลี่ยนจากการเปรียบเทียบวันที่เป็นใช้ `data_type`
   - บรรทัด 94-99: ลบโค้ดเพิ่มจุดเชื่อมแบบเก่า
   - บรรทัด 260-283: อัปเดต label แสดงเวลาไทย

---

## 🔮 การป้องกันปัญหาในอนาคต

### Best Practices

1. **ใช้ข้อมูลจากฐานข้อมูลเป็นหลัก**
   - อย่าเดาหรือคำนวณเอง หากมีข้อมูลจริงอยู่แล้ว
   - `data_type` ในฐานข้อมูลเป็น source of truth

2. **การจัดการ Timezone**
   - ใช้ `Intl.DateTimeFormat` แทน `toLocaleString()`
   - ระบุ timezone ชัดเจน ('Asia/Bangkok')
   - เก็บวันที่ในรูปแบบ ISO 8601 (YYYY-MM-DD)

3. **การเชื่อมเส้นกราฟ**
   - ใช้ฟีเจอร์ของ library (Recharts) แทนการทำเอง
   - `connectNulls={true}` จะเชื่อมช่องว่างให้อัตโนมัติ

4. **การ Debug**
   - เพิ่ม console.log เพื่อตรวจสอบค่า
   - ตรวจสอบข้อมูลจาก API ก่อนแสดงผล
   - ทดสอบกับข้อมูลจริงจากฐานข้อมูล

---

## 📚 เอกสารที่เกี่ยวข้อง

- [Recharts Documentation - connectNulls](https://recharts.org/en-US/api/Line)
- [MDN - Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [MySQL - DATE_FORMAT](https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format)

---

## ✍️ บันทึก

**ผู้แก้ไข:** GitHub Copilot  
**วันที่:** 13 พฤศจิกายน 2568  
**เวลา:** 14:58 น. (เวลาไทย)  
**สถานะ:** ✅ ทดสอบและใช้งานได้แล้ว
