import React from 'react';

const AlertsPanel = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="alerts-section">
      <h2 style={{ color: '#dc3545', marginBottom: '15px' }}>
        ⚠️ การแจ้งเตือน ({alerts.length})
      </h2>
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`alert-item ${alert.severity === 'critical' ? 'alert-critical' : 'alert-warning'}`}
        >
          <div className="alert-header">
            {alert.severity === 'critical' ? '🚨' : '⚠️'} สถานี {alert.station_id} - {alert.station_name}
          </div>
          <div className="alert-details">
            ระดับน้ำ: {alert.water_level} ม. / ระดับตลิ่ง: {alert.bank_level} ม. ({alert.percentage}%)
          </div>
          <div className="alert-details">
            สถานะ: {alert.severity === 'critical' ? 'วิกฤต - ระดับน้ำเกินตลิ่ง' : 'เฝ้าระวัง - ระดับน้ำใกล้ตลิ่ง'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertsPanel;
