import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WaterLevelChart from '../components/WaterLevelChart';
import AlertsPanel from '../components/AlertsPanel';
import StationMap from '../components/StationMap';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Dashboard() {
  const [metadata, setMetadata] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: '2025-10-24',
    end: '2025-11-16',
    aggregation: 'day'
  });
  const [selectedStations, setSelectedStations] = useState([]);

  useEffect(() => {
    fetchAllData();
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
          aggregation: dateRange.aggregation || 'day'
        }
      });
      setChartData(response.data.data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1>ระบบติดตามระดับน้ำ</h1>
        <p>Water Level Monitoring Dashboard</p>
      
      </div>

      {error && <div className="error">{error}</div>}

      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      <div className="dashboard-grid">
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
    </div>
  );
}

export default Dashboard;
