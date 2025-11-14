const axios = require('axios');

// List of possible API endpoints to test
const apiEndpoints = [
  {
    name: 'Original API (option=2)',
    url: 'https://www.rid.go.th/ffwsv2/_6_ReportDataAll/getDailyWaterLevelListReportMSL.ashx?option=2'
  },
  {
    name: 'API without option parameter',
    url: 'https://www.rid.go.th/ffwsv2/_6_ReportDataAll/getDailyWaterLevelListReportMSL.ashx'
  },
  {
    name: 'API with option=1',
    url: 'https://www.rid.go.th/ffwsv2/_6_ReportDataAll/getDailyWaterLevelListReportMSL.ashx?option=1'
  },
  {
    name: 'Test base path',
    url: 'https://www.rid.go.th/ffwsv2/'
  },
  {
    name: 'Test report path',
    url: 'https://www.rid.go.th/ffwsv2/_6_ReportDataAll/'
  }
];

async function testEndpoint(endpoint) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${endpoint.name}`);
  console.log(`URL: ${endpoint.url}`);
  console.log('='.repeat(60));
  
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear() + 543;
  const currentDate = `${day}/${month}/${year}`;
  
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
  
  try {
    const response = await axios.post(endpoint.url, params.toString(), {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      },
      validateStatus: () => true
    });
    
    console.log(`✅ Response: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! This endpoint works!');
      console.log('Response preview:', JSON.stringify(response.data).substring(0, 200));
      return true;
    } else {
      console.log(`❌ Error: ${response.status}`);
      console.log('Response:', typeof response.data === 'string' ? response.data.substring(0, 100) : response.data);
      return false;
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Multiple RID API Endpoints...\n');
  console.log(`Date: ${new Date().toLocaleString()}\n`);
  
  let successCount = 0;
  
  for (const endpoint of apiEndpoints) {
    const success = await testEndpoint(endpoint);
    if (success) successCount++;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary: ${successCount} out of ${apiEndpoints.length} endpoints working`);
  console.log('='.repeat(60));
  
  if (successCount === 0) {
    console.log('\n❌ All endpoints failed!');
    console.log('\nPossible reasons:');
    console.log('1. API has been completely redesigned or moved');
    console.log('2. Access requires authentication/API key');
    console.log('3. Service is temporarily down for maintenance');
    console.log('4. IP/region restrictions');
    console.log('\nRecommendations:');
    console.log('- Visit https://www.rid.go.th to check for API documentation');
    console.log('- Contact RID for current API endpoint information');
    console.log('- Look for alternative data sources');
  }
}

main();
