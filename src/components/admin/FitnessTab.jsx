import React, { useState } from 'react';
import './../AdminPage.css';

const FitnessTab = ({ data = {}, onApprove = () => {}, onReject = () => {}, filterOwnerUid = null }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const pendingList = (filterOwnerUid
    ? (data.pendingFitness || []).filter(f => String(f.owner_id) === String(filterOwnerUid) || String(f.owner_uid) === String(filterOwnerUid))
    : (data.pendingFitness || [])
  );

  const approvedList = (filterOwnerUid
    ? (data.approvedFitness || []).filter(f => String(f.owner_id) === String(filterOwnerUid) || String(f.owner_uid) === String(filterOwnerUid))
    : (data.approvedFitness || [])
  );

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleApprove = async (request) => {
    await onApprove(request);
    setShowModal(false);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
    setShowModal(false);
  };

  const confirmReject = async () => {
    await onReject(selectedRequest, rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  return (
    <>
      <div className="fitness-content">
        <h2>🏋️ จัดการฟิตเนส</h2>

        <div className="fitness-stats">
          <div className="stat-card">
            <h3>⏳ รออนุมัติ</h3>
            <div className="stat-number">{pendingList.length}</div>
            <div className="stat-label">รายการ</div>
          </div>
          <div className="stat-card">
            <h3>✅ อนุมัติแล้ว</h3>
            <div className="stat-number">{approvedList.length}</div>
            <div className="stat-label">รายการ</div>
          </div>
        </div>

        <div className="section">
          <h3>📝 คำขอสร้างฟิตเนสที่รออนุมัติ</h3>
          {pendingList.length > 0 ? (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ชื่อฟิตเนส</th>
                    <th>พาร์ทเนอร์</th>
                    <th>ราคา</th>
                    <th>สถานที่</th>
                    <th>วันที่ส่ง</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingList.map((request, index) => (
                    <tr key={request.id || index}>
                      <td>{request.fit_name}</td>
                      <td>{request.owner_info?.owner_name || request.owner_name || request.owner_id || 'ไม่ระบุ'}</td>
                      <td>฿{request.fit_price}</td>
                      <td>{request.fit_location}</td>
                      <td>{request.created_at ? new Date(request.created_at).toLocaleDateString('th-TH') : '-'}</td>
                      <td>
                        <button className="btn-view" onClick={() => handleViewDetails(request)}>ดูรายละเอียด</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="info-card">
              <p>🎉 ไม่มีคำขอสร้างฟิตเนสที่รออนุมัติ</p>
            </div>
          )}
        </div>

        <div className="section">
          <h3>✅ ฟิตเนสที่อนุมัติแล้ว</h3>
          {approvedList.length > 0 ? (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ชื่อฟิตเนส</th>
                    <th>พาร์ทเนอร์</th>
                    <th>ราคา</th>
                    <th>สถานที่</th>
                    <th>วันที่อนุมัติ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedList.map((fitness, index) => (
                    <tr key={fitness.fit_id || index}>
                      <td>{fitness.fit_name}</td>
                      <td>{fitness.owner_info?.owner_name || fitness.fit_user || fitness.owner_name || 'ไม่ระบุ'}</td>
                      <td>฿{fitness.fit_price}</td>
                      <td>{fitness.fit_location}</td>
                      <td>{fitness.created_at ? new Date(fitness.created_at).toLocaleDateString('th-TH') : '-'}</td>
                      <td>
                        <span className="status-active">เปิดใช้งาน</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="info-card">
              <p>ไม่มีฟิตเนสที่อนุมัติแล้ว</p>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedRequest && (
        <DetailsModal
          request={selectedRequest}
          onClose={() => setShowModal(false)}
          onApproveClick={handleApprove}
          onRejectClick={handleReject}
        />
      )}

      {showRejectModal && selectedRequest && (
        <RejectModal
          request={selectedRequest}
          reason={rejectionReason}
          setReason={setRejectionReason}
          onConfirm={confirmReject}
          onClose={() => setShowRejectModal(false)}
        />
      )}
    </>
  );
};

const DetailsModal = ({ request, onClose, onApproveClick, onRejectClick }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>รายละเอียดคำขอสร้างฟิตเนส</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label>ชื่อฟิตเนส:</label>
          <div>{request.fit_name}</div>
        </div>
        <div className="form-group">
          <label>พาร์ทเนอร์/เจ้าของ:</label>
          <div>{request.owner_info?.owner_name || request.owner_name || request.owner_id}</div>
        </div>
        <div className="form-group">
          <label>ราคา:</label>
          <div>฿{request.fit_price}</div>
        </div>
        <div className="form-group">
          <label>สถานที่:</label>
          <div>{request.fit_location}</div>
        </div>
        <div className="form-group">
          <label>คำอธิบาย:</label>
          <div style={{ whiteSpace: 'pre-wrap' }}>{request.fit_description}</div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-primary" onClick={() => onApproveClick(request)}>อนุมัติ</button>
        <button className="btn-danger" onClick={() => onRejectClick(request)}>ปฏิเสธ</button>
        <button className="btn-secondary" onClick={onClose}>ปิด</button>
      </div>
    </div>
  </div>
);

const RejectModal = ({ request, reason, setReason, onConfirm, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content modal-danger" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>ปฏิเสธคำขอ</h3>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        <div className="form-group">
          <label>เหตุผลในการปฏิเสธ (ไม่บังคับ):</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-primary" onClick={onConfirm}>ยืนยันการปฏิเสธ</button>
        <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
      </div>
    </div>
  </div>
);

export default FitnessTab;
