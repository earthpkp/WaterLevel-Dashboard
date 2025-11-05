import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WaterLevelChart from './components/WaterLevelChart';
import StationCard from './components/StationCard';
import AlertsPanel from './components/AlertsPanel';
import Statistics from './components/Statistics';
import StationMap from './components/StationMap';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [metadata, setMetadata] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: '2018-01-01',
    end: '2024-12-31',
    aggregation: 'month'
  });
  const [selectedStations, setSelectedStations] = useState([]);

  useEffect(() => {
    fetchAllData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAllData, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [dateRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [metadataRes, latestRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/api/metadata`),
        axios.get(`${API_URL}/api/waterlevel/latest`),
        axios.get(`${API_URL}/api/alerts`)
      ]);

      setMetadata(metadataRes.data.data);
      setLatestData(latestRes.data.data);
      setAlerts(alertsRes.data.data);
      setError(null);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/waterlevel/chart`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
          aggregation: dateRange.aggregation || 'month'
        }
      });
      setChartData(response.data.data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const getLevelStatus = (currentLevel, bankLevel) => {
    const percentage = (parseFloat(currentLevel) / parseFloat(bankLevel)) * 100;
    if (percentage >= 100) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🌊 ระบบติดตามระดับน้ำ </h1>
        <p>Water Level Monitoring Dashboard </p>
        {latestData && (
          <p style={{ marginTop: '10px', color: '#999' }}>
            อัปเดตล่าสุด: {new Date(latestData.date_time).toLocaleString('th-TH')}
          </p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px',
        alignItems: 'stretch'
      }}>
        <StationMap
          metadata={metadata}
          latestData={latestData}
          onStationSelect={setSelectedStations}
          selectedStations={selectedStations}
        />

        <WaterLevelChart
          data={chartData}
          dateRange={dateRange}
          setDateRange={setDateRange}
          metadata={metadata}
          selectedStations={selectedStations}
        />
      </div>

      {/* <Statistics metadata={metadata} />

      <div className="dashboard-grid">
        {metadata.map((station) => {
          const columnName = `x_${station.station_id.toLowerCase().replace('.', '')}`;
          const currentLevel = latestData ? latestData[columnName] : null;
          const status = currentLevel ? getLevelStatus(currentLevel, parseFloat(station.bank_level)) : 'normal';

          return (
            <StationCard
              key={station.id}
              station={station}
              currentLevel={currentLevel}
              status={status}
            />
          );
        })}
      </div> */}



    </div>
  );
}

export default App;
