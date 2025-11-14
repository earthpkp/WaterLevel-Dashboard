const axios = require('axios');

async function testRIDAPI() {
  console.log('🧪 Testing RID External API...\n');
  
  // สร้างวันที่ปัจจุบันในรูปแบบ DD/MM/YYYY (พ.ศ.)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear() + 543; // แปลงเป็นพ.ศ.
  const currentDate = `${day}/${month}/${year}`;
  
  console.log(`📅 Testing with date: ${currentDate} (Thai Buddhist calendar)`);
  console.log(`📅 Gregorian: ${now.toLocaleDateString()}\n`);
  
  const apiUrl = 'https://www.rid.go.th/ffwsv2/_6_ReportDataAll/getDailyWaterLevelListReportMSL.ashx?option=2';
  
  // สร้าง payload แบบ x-www-form-urlencoded
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
  console.log('Content-Type: application/x-www-form-urlencoded');
  console.log('\n📦 Payload:');
  console.log(params.toString());
  console.log('\n⏳ Sending request...\n');
  
  try {
    const response = await axios.post(apiUrl, params.toString(), {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      validateStatus: function (status) {
        return true; // Accept any status code
      }
    });
    
    console.log('✅ Response Received!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📊 Status Code: ${response.status} ${response.statusText}`);
    console.log(`📋 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length'] || 'unknown'}`);
    console.log('\n📄 Response Data:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (response.status === 200) {
      console.log('✅ SUCCESS! API is working!\n');
      
      // Check data type
      const dataType = typeof response.data;
      console.log(`Data Type: ${dataType}`);
      
      if (dataType === 'string') {
        console.log(`Data Length: ${response.data.length} characters`);
        console.log('\nFirst 500 characters:');
        console.log(response.data.substring(0, 500));
        
        // Try to parse as JSON
        try {
          const jsonData = JSON.parse(response.data);
          console.log('\n✅ Valid JSON detected!');
          console.log('Parsed structure:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          console.log('\n⚠️ Not valid JSON - might be HTML or other format');
        }
      } else if (dataType === 'object') {
        console.log('\n📊 Response Structure:');
        console.log('Keys:', Object.keys(response.data));
        
        if (Array.isArray(response.data)) {
          console.log(`Array with ${response.data.length} items`);
          if (response.data.length > 0) {
            console.log('\nFirst item:');
            console.log(JSON.stringify(response.data[0], null, 2));
          }
        } else if (response.data.rows) {
          console.log(`\n✅ Found 'rows' property with ${response.data.rows.length} items`);
          if (response.data.rows.length > 0) {
            console.log('\nFirst row:');
            console.log(JSON.stringify(response.data.rows[0], null, 2));
            
            // Check for our expected fields
            const firstRow = response.data.rows[0];
            console.log('\n🔍 Checking for expected fields:');
            console.log(`  - stationcode: ${firstRow.stationcode || 'NOT FOUND'}`);
            console.log(`  - waterlevelvalueQ1: ${firstRow.waterlevelvalueQ1 || 'NOT FOUND'}`);
          }
        } else {
          console.log('\nFull response data:');
          console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
        }
      }
      
      // Try to find our stations
      console.log('\n\n🔍 Searching for our stations (X.274, X.119A, X.119)...');
      let records = [];
      if (Array.isArray(response.data)) {
        records = response.data;
      } else if (response.data.rows) {
        records = response.data.rows;
      } else if (response.data.data) {
        records = response.data.data;
      }
      
      const ourStations = ['X.274', 'X.119A', 'X.119'];
      const foundStations = records.filter(item => {
        const code = item.stationcode || item.StationCode || item.station_code || item.id;
        return ourStations.includes(code);
      });
      
      if (foundStations.length > 0) {
        console.log(`✅ Found ${foundStations.length} of our stations!`);
        foundStations.forEach(station => {
          console.log('\n' + JSON.stringify(station, null, 2));
        });
      } else {
        console.log('⚠️ Our stations not found in response');
        if (records.length > 0) {
          console.log('\nSample record to check field names:');
          console.log(JSON.stringify(records[0], null, 2));
        }
      }
      
    } else {
      console.log(`❌ API returned error status: ${response.status}\n`);
      console.log('Response data:');
      console.log(response.data);
    }
    
  } catch (error) {
    console.log('❌ ERROR occurred!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (error.response) {
      console.log(`HTTP Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`Content-Type: ${error.response.headers['content-type']}`);
      console.log('\nResponse Data:');
      console.log(error.response.data);
    } else if (error.request) {
      console.log('No response received from server');
      console.log('Error:', error.message);
    } else {
      console.log('Error setting up request:', error.message);
    }
    
    console.log('\n📋 Full error details:');
    console.log(error);
  }
}

// Run the test
testRIDAPI();
