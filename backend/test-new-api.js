const axios = require('axios');

async function testNewRIDAPI() {
  console.log('🧪 Testing NEW RID API Endpoint...\n');
  
  // สร้างวันที่ในรูปแบบ DD/MM/YYYY (พ.ศ.)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear() + 543;
  const currentDate = `${day}/${month}/${year}`;
  
  console.log(`📅 Testing with date: ${currentDate} (พ.ศ.)`);
  console.log(`📅 Gregorian: ${now.toLocaleDateString()}\n`);
  
  const apiUrl = 'https://hyd-app-db.rid.go.th/webservice/getDailyWaterLevelListReportMSL.ashx?option=2';
  
  const params = new URLSearchParams({
    "DW[UtokID]": "8",
    "DW[TimeCurrent]": currentDate,
    "_search": "false",
    "nd": Date.now().toString(),
    "rows": "1000",
    "page": "1",
    "sidx": "indexcount",
    "sord": "asc"
  });
  
  console.log('📡 Request Details:');
  console.log('URL:', apiUrl);
  console.log('Method: POST');
  console.log('Payload:', params.toString());
  console.log('\n⏳ Sending request...\n');
  
  try {
    const response = await axios.post(apiUrl, params.toString(), {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      validateStatus: () => true
    });
    
    console.log('✅ Response Received!');
    console.log('='.repeat(60));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);
    console.log('='.repeat(60));
    
    if (response.status === 200) {
      console.log('\n🎉 SUCCESS! API is working!\n');
      
      const dataType = typeof response.data;
      console.log(`Data Type: ${dataType}`);
      
      if (dataType === 'object') {
        console.log('Keys:', Object.keys(response.data));
        
        if (response.data.rows) {
          console.log(`\n✅ Found ${response.data.rows.length} records`);
          
          if (response.data.rows.length > 0) {
            console.log('\n📋 First Record:');
            console.log(JSON.stringify(response.data.rows[0], null, 2));
            
            // ค้นหาสถานีของเรา
            console.log('\n🔍 Searching for our stations (X.274, X.119A, X.119)...');
            const ourStations = ['X.274', 'X.119A', 'X.119'];
            const found = response.data.rows.filter(item => 
              ourStations.includes(item.stationcode)
            );
            
            if (found.length > 0) {
              console.log(`\n🎯 Found ${found.length} of our stations!`);
              found.forEach(station => {
                console.log(`\nStation: ${station.stationcode}`);
                console.log(`Water Level: ${station.waterlevelvalueQ1}`);
                console.log(JSON.stringify(station, null, 2));
              });
            } else {
              console.log('⚠️ Our stations not found');
              console.log(`Total stations in response: ${response.data.rows.length}`);
              
              // แสดง stationcode ทั้งหมด
              const allCodes = response.data.rows.map(r => r.stationcode).filter(Boolean);
              console.log('\nAvailable station codes:', allCodes.slice(0, 20).join(', '));
            }
          }
        } else {
          console.log('\nFull response:');
          console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
        }
      } else if (dataType === 'string') {
        console.log(`String response (${response.data.length} chars)`);
        console.log(response.data.substring(0, 500));
      }
      
    } else {
      console.log(`\n❌ API returned error: ${response.status}`);
      console.log(response.data);
    }
    
  } catch (error) {
    console.log('❌ ERROR!');
    console.log('='.repeat(60));
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, error.response.data);
    } else {
      console.log(`Error: ${error.message}`);
    }
  }
}

testNewRIDAPI();
