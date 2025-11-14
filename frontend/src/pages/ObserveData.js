import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ObserveData.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ObserveData() {
  const [observeData, setObserveData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dataTypeFilter, setDataTypeFilter] = useState('all'); // 'all', 'observe', 'forecast'
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDateRange, setImportDateRange] = useState({
    start: '',
    end: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchObserveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ดึงข้อมูลทั้งหมดแบบรายวัน (ไม่กรองวันที่)
      const params = {
        aggregation: 'day'
      };
      
      // ถ้าเลือกแสดงเฉพาะประเภทใดประเภทหนึ่ง
      if (dataTypeFilter !== 'all') {
        params.data_type = dataTypeFilter;
      }
      
      const response = await axios.get(`${API_URL}/api/waterlevel/chart`, {
        params: params
      });

      setObserveData(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching observe data:', err);
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล Observe');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObserveData();
  }, [dataTypeFilter]); // เรียกใหม่ทุกครั้งที่เปลี่ยนประเภทข้อมูล

  const downloadCSV = () => {
    if (observeData.length === 0) return;

    // Create CSV content
    const headers = ['วันที่', 'X.274', 'X.119A', 'X.119'];
    const csvContent = [
      headers.join(','),
      ...observeData.map(row => [
        row.period,
        row.x_274_avg || '',
        row.x_119a_avg || '',
        row.x_119_avg || ''
      ].join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `observe_data_all.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromAPI = async () => {
    // เปิด dialog แทน prompt
    setShowImportDialog(true);
  };

  const handleImportConfirm = async () => {
    setError(null);
    setSuccessMessage(null);

    // ตรวจสอบว่าระบุวันที่เริ่มต้น
    if (!importDateRange.start) {
      setError('กรุณาระบุวันที่เริ่มต้น');
      return;
    }

    setShowImportDialog(false);

    // แปลงวันที่จาก YYYY-MM-DD (ค.ศ.) เป็น DD/MM/YYYY (พ.ศ.)
    const convertToThaiDate = (dateStr) => {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    };

    const startDate = convertToThaiDate(importDateRange.start);
    const endDate = importDateRange.end ? convertToThaiDate(importDateRange.end) : '';

    try {
      setImporting(true);
      setError(null);
      setSuccessMessage(null);

      // ส่งพารามิเตอร์ไปยัง API
      const payload = {
        utokID: "8", // ค่า default สำหรับลุ่มน้ำโกลก
        startDate: startDate
      };

      // ถ้าระบุวันสิ้นสุดให้ส่งไปด้วย
      if (endDate) {
        payload.endDate = endDate;
      }

      console.log('Sending import request with:', payload);

      const response = await axios.post(`${API_URL}/api/import/observe`, payload);

      console.log('Import response:', response.data);

      if (response.data.success) {
        const total = response.data.imported + response.data.updated;
        const failedCount = response.data.failed || 0;
        
        let message = `✅ นำเข้าข้อมูลสำเร็จ!\n`;
        message += `ข้อมูลใหม่: ${response.data.imported} รายการ\n`;
        message += `อัพเดต: ${response.data.updated} รายการ`;
        
        if (failedCount > 0) {
          message += `\n⚠️ ล้มเหลว: ${failedCount} วัน`;
        }

        if (total === 0 && failedCount === 0) {
          setSuccessMessage(
            `⚠️ ${response.data.message || 'ไม่พบข้อมูลสำหรับสถานีที่ระบุ'}`
          );
        } else {
          setSuccessMessage(message);
        }
        
        // Refresh data after import
        setTimeout(() => {
          fetchObserveData();
          if (total > 0) {
            setSuccessMessage(null);
          }
        }, 3000);
      } else {
        setError(response.data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      }
    } catch (err) {
      console.error('Error importing data:', err);
      
      // Extract the most detailed error message available
      let errorMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ API';
      
      if (err.response?.data) {
        // If we have details, show them
        if (err.response.data.details) {
          errorMsg = err.response.data.details;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setImporting(false);
    }
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('กรุณาเลือกไฟล์ CSV เท่านั้น');
      event.target.value = '';
      return;
    }

    if (!window.confirm(
      `ต้องการนำเข้าข้อมูล Forecast จากไฟล์ "${file.name}" หรือไม่?\n\n` +
      'รูปแบบไฟล์ที่รองรับ:\n' +
      'date_time,x_274,x_119a,x_119\n' +
      '2025-11-07,18.50,5.20,3.10'
    )) {
      event.target.value = '';
      return;
    }

    try {
      setUploadingCSV(true);
      setError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading forecast CSV file:', file.name);

      const response = await axios.post(`${API_URL}/api/import/forecast/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload response:', response.data);

      if (response.data.success) {
        const total = response.data.imported + response.data.updated;
        setSuccessMessage(
          `✅ นำเข้าข้อมูล Forecast สำเร็จ!\n` +
          `ข้อมูลใหม่: ${response.data.imported} รายการ\n` +
          `อัพเดต: ${response.data.updated} รายการ\n` +
          `${response.data.skipped ? `ข้าม: ${response.data.skipped} รายการ` : ''}`
        );
        
        // Refresh data after import
        setTimeout(() => {
          fetchObserveData();
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(response.data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      }
    } catch (err) {
      console.error('Error uploading CSV:', err);
      
      let errorMsg = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์';
      if (err.response?.data) {
        if (err.response.data.details) {
          errorMsg = err.response.data.details;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setUploadingCSV(false);
      event.target.value = ''; // Reset file input
    }
  };

  const deleteForecastData = async () => {
    if (!window.confirm(
      '⚠️ คำเตือน: ต้องการลบข้อมูล Forecast ทั้งหมดหรือไม่?\n\n' +
      'การลบข้อมูลนี้ไม่สามารถย้อนกลับได้!'
    )) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setSuccessMessage(null);

      console.log('Deleting all forecast data...');

      const response = await axios.delete(`${API_URL}/api/waterlevel/forecast`);

      console.log('Delete response:', response.data);

      if (response.data.success) {
        setSuccessMessage(
          `✅ ลบข้อมูล Forecast สำเร็จ!\n` +
          `จำนวนที่ลบ: ${response.data.deleted} รายการ`
        );
        
        // Refresh data after delete
        setTimeout(() => {
          fetchObserveData();
          setSuccessMessage(null);
        }, 2000);
      } else {
        setError(response.data.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (err) {
      console.error('Error deleting forecast data:', err);
      
      let errorMsg = 'เกิดข้อผิดพลาดในการลบข้อมูล Forecast';
      if (err.response?.data) {
        if (err.response.data.details) {
          errorMsg = err.response.data.details;
        } else if (err.response.data.error) {
          errorMsg = err.response.data.error;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Pagination calculations
  const totalItems = observeData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = observeData.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  const handleFilterChange = (value) => {
    setDataTypeFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="observe-data-container">
      <div className="observe-header">
        <h1>📊 ข้อมูลระดับน้ำ</h1>
        <p>ข้อมูลระดับน้ำที่บันทึกจากสถานีวัดน้ำและข้อมูลคาดการณ์</p>
      </div>

      <div className="controls-section">
        <div className="controls-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
          {/* Dropdown เลือกประเภทข้อมูล */}
          <div className="filter-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="dataTypeFilter" style={{ fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>
              ประเภทข้อมูล:
            </label>
            <select 
              id="dataTypeFilter"
              value={dataTypeFilter} 
              onChange={(e) => handleFilterChange(e.target.value)}
              className="data-type-select"
              style={{
                padding: '10px 15px',
                borderRadius: '8px',
                border: '2px solid #667eea',
                fontSize: '14px',
                fontWeight: '500',
                color: '#333',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '180px',
                outline: 'none'
              }}
            >
              <option value="all">📊 ทั้งหมด</option>
              <option value="observe">🔍 Observe</option>
              <option value="forecast">🔮 Forecast</option>
            </select>
          </div>

          {/* ปุ่ม Actions */}
          <div className="action-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={fetchObserveData} disabled={loading}>
              {loading ? '🔄 กำลังโหลด...' : '🔄 รีเฟรชข้อมูล'}
            </button>
            <button className="btn btn-import" onClick={importFromAPI} disabled={importing}>
              {importing ? '⏳ กำลังนำเข้า...' : '📡 ดึงข้อมูลจาก API'}
            </button>
            <button className="btn btn-success" onClick={downloadCSV} disabled={observeData.length === 0}>
              📥 ดาวน์โหลด CSV
            </button>
            <label className="btn btn-upload">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploadingCSV}
                style={{ display: 'none' }}
              />
              {uploadingCSV ? '⏳ กำลังอัปโหลด...' : '📤 นำเข้า Forecast CSV'}
            </label>
            <button 
              className="btn btn-danger" 
              onClick={deleteForecastData} 
              disabled={deleting}
              style={{
                backgroundColor: deleting ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              {deleting ? '⏳ กำลังลบ...' : '🗑️ ลบข้อมูล Forecast'}
            </button>
          </div>
        </div>
      </div>

      {showImportDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>📡 นำเข้าข้อมูลจาก API กรมชลประทาน</h3>
            <div className="modal-body">
              <label>
                วันที่เริ่มต้น: <span style={{ color: 'red' }}>*</span>
                <input
                  type="date"
                  value={importDateRange.start}
                  onChange={(e) => setImportDateRange(prev => ({ ...prev, start: e.target.value }))}
                  required
                />
              </label>
              <label>
                วันที่สิ้นสุด: <span style={{ color: '#999', fontSize: '0.9em' }}>(ไม่บังคับ)</span>
                <input
                  type="date"
                  value={importDateRange.end}
                  onChange={(e) => setImportDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </label>
              <div className="modal-info">
                <p>💡 <strong>คำแนะนำ:</strong></p>
                <ul>
                  <li>ระบุเฉพาะวันที่เริ่มต้นเพื่อดึงข้อมูลวันเดียว</li>
                  <li>ระบุทั้งวันที่เริ่มต้นและสิ้นสุดเพื่อดึงข้อมูลช่วงวันที่</li>
                  <li>ระบบจะรอ 1 วินาทีระหว่างการดึงแต่ละวัน</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowImportDialog(false)}>
                ❌ ยกเลิก
              </button>
              <button className="btn btn-import" onClick={handleImportConfirm}>
                ✅ ยืนยันนำเข้า
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <div className="data-section">
          <div className="data-summary">
            <h3>📈 สรุปข้อมูล</h3>
            <div className="summary-cards">
              <div className="summary-card">
                <span className="summary-label">จำนวนข้อมูล</span>
                <span className="summary-value">{observeData.length} รายการ</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">ประเภทข้อมูล</span>
                <span className="summary-value">
                  {dataTypeFilter === 'all' ? '📊 ทั้งหมด' : 
                   dataTypeFilter === 'observe' ? '🔍 Observe (สังเกต)' : 
                   '🔮 Forecast (คาดการณ์)'}
                </span>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>วันที่/ช่วงเวลา</th>
                  <th>X.274 (ม.)</th>
                  <th>X.119A (ม.)</th>
                  <th>X.119 (ม.)</th>
                  <th>ประเภท</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                      ไม่พบข้อมูล
                      {dataTypeFilter === 'observe' ? ' Observe' : 
                       dataTypeFilter === 'forecast' ? ' Forecast' : ''}
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, index) => (
                    <tr key={index}>
                      <td>{startIndex + index + 1}</td>
                      <td>{row.period}</td>
                      <td>{parseFloat(row.x_274_avg).toFixed(2)}</td>
                      <td>{parseFloat(row.x_119a_avg).toFixed(2)}</td>
                      <td>{parseFloat(row.x_119_avg).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${row.data_type === 'forecast' ? 'badge-forecast' : 'badge-observe'}`}>
                          {row.data_type === 'forecast' ? 'Forecast' : 'Observe'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {observeData.length > 0 && (
            <div className="pagination-container" style={{ 
              marginTop: '20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px'
            }}>
              {/* Items per page selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: '500', color: '#333' }}>แสดง:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => handleItemsPerPageChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span style={{ color: '#666' }}>รายการต่อหน้า</span>
              </div>

              {/* Page info */}
              <div style={{ fontWeight: '500', color: '#333' }}>
                หน้า {currentPage} จาก {totalPages} (ทั้งหมด {totalItems} รายการ)
              </div>

              {/* Page navigation */}
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === 1 ? '#f0f0f0' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  «
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === 1 ? '#f0f0f0' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ‹ ก่อนหน้า
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        backgroundColor: currentPage === pageNum ? '#667eea' : 'white',
                        color: currentPage === pageNum ? 'white' : '#333',
                        cursor: 'pointer',
                        fontWeight: '500',
                        minWidth: '40px'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === totalPages ? '#f0f0f0' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ถัดไป ›
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === totalPages ? '#f0f0f0' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ObserveData;
