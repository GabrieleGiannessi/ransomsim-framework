import React, { useState, useEffect } from 'react';
import { Table, Pagination, Form, Spinner, Badge, Card, Row, Col } from 'react-bootstrap';
import { getPatients, type Patient, type PaginatedResponse } from '../api/patientService';
import { FiSearch, FiLock } from 'react-icons/fi';

// ─── Ransom Screen ──────────────────────────────────────────────────────────
const RansomScreen: React.FC = () => (
  <div
    style={{
      backgroundColor: '#000',
      color: '#ff0000',
      fontFamily: "'Courier New', monospace",
      padding: '3rem 2rem',
      textAlign: 'center',
      borderRadius: '8px',
      border: '2px solid #ff0000',
      boxShadow: '0 0 40px rgba(255, 0, 0, 0.4)',
      animation: 'ransom-flicker 3s infinite',
    }}
  >
    <div style={{ fontSize: '4rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px red)' }}>
      ☣️
    </div>
    <h2 style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '4px', textShadow: '0 0 10px red' }}>
      SYSTEM ENCRYPTED
    </h2>
    <hr style={{ borderColor: '#ff000066', margin: '1.5rem auto', width: '60%' }} />
    <p style={{ fontSize: '1.1rem', color: '#ff6666' }}>
      Your healthcare records have been <strong style={{ color: '#ff0000' }}>locked with AES-256-CBC</strong>.
    </p>
    <p style={{ color: '#cc0000', fontSize: '0.95rem' }}>
      The database is no longer accessible.
    </p>
    <div
      style={{
        margin: '2rem auto',
        padding: '1.5rem',
        backgroundColor: '#110000',
        border: '1px solid #ff000044',
        borderRadius: '4px',
        maxWidth: '500px',
        fontSize: '0.9rem',
        color: '#ff9999',
        textAlign: 'left',
      }}
    >
      <div><span style={{ color: '#ff4444' }}>Contact:</span> ransomware@darknet.example</div>
      <div><span style={{ color: '#ff4444' }}>Bitcoin address:</span> 1A1zP1eP5QGefi2DMPTfTL5SLmv7...</div>
      <div style={{ marginTop: '0.5rem', color: '#ff6666', fontSize: '0.8rem' }}>
        Ransom note → /tmp/recon/README_DECRYPT.txt
      </div>
    </div>
    <div style={{ color: '#550000', fontSize: '0.75rem', marginTop: '1rem' }}>
      <FiLock className="me-1" />
      Patient records, billing data and backups have been encrypted.
    </div>
    <style>{`
      @keyframes ransom-flicker {
        0%, 95%, 100% { opacity: 1; }
        96% { opacity: 0.85; }
        97% { opacity: 1; }
        98% { opacity: 0.9; }
      }
    `}</style>
  </div>
);

// ─── PatientTable ────────────────────────────────────────────────────────────
export const PatientTable: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ransomed, setRansomed] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [conditionFilter, setConditionFilter] = useState<string>('');
  const limit = 20;

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const skip = (page - 1) * limit;
        const res = await getPatients(skip, limit, conditionFilter || undefined);
        setData(res);
        setRansomed(false);
      } catch (err: any) {
        // Axios surfaces HTTP errors in err.response; detect the ransomware signal
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail;
        if (status === 503 && detail === 'ransomed') {
          setRansomed(true);
        } else {
          setError('Failed to fetch patient data.');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [page, conditionFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConditionFilter(e.target.value);
    setPage(1);
  };

  const renderPagination = () => {
    if (!data) return null;
    const totalPages = Math.ceil(data.total / limit);
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    const items = [];
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === page} onClick={() => setPage(i)}>
          {i}
        </Pagination.Item>
      );
    }
    return (
      <Pagination className="justify-content-end mt-3 mb-0">
        <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
        <Pagination.Prev onClick={() => setPage(page - 1)} disabled={page === 1} />
        {startPage > 1 && <Pagination.Ellipsis disabled />}
        {items}
        {endPage < totalPages && <Pagination.Ellipsis disabled />}
        <Pagination.Next onClick={() => setPage(page + 1)} disabled={page === totalPages} />
        <Pagination.Last onClick={() => setPage(totalPages)} disabled={page === totalPages} />
      </Pagination>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
      <Card.Header className="bg-white border-bottom-0 pt-4 pb-0 px-4">
        <Row className="align-items-center">
          <Col md={6}>
            <h5 className="mb-0 fw-bold text-dark">Patient Registry</h5>
          </Col>
          <Col md={6}>
            <div className="position-relative">
              <FiSearch className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
              <Form.Control
                type="text"
                placeholder="Search by medical condition..."
                value={conditionFilter}
                onChange={handleSearch}
                className="ps-5 rounded-pill bg-light border-0"
                disabled={ransomed}
              />
            </div>
          </Col>
        </Row>
      </Card.Header>

      <Card.Body className="p-0 mt-3">
        {loading && (
          <div className="text-center p-5">
            <Spinner animation="border" variant="primary" />
          </div>
        )}

        {/* ── RANSOMWARE SCREEN ─────────────────── */}
        {!loading && ransomed && (
          <div className="p-4">
            <RansomScreen />
          </div>
        )}

        {/* ── GENERIC ERROR ─────────────────────── */}
        {!loading && !ransomed && error && (
          <div className="text-center p-5 text-danger">{error}</div>
        )}

        {/* ── NORMAL DATA ───────────────────────── */}
        {!loading && !ransomed && !error && data && (
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="bg-light text-muted">
                <tr>
                  <th className="fw-medium px-4 border-0">Name</th>
                  <th className="fw-medium border-0">Age</th>
                  <th className="fw-medium border-0">Gender</th>
                  <th className="fw-medium border-0">Blood Type</th>
                  <th className="fw-medium border-0">Condition</th>
                  <th className="fw-medium border-0">Admission</th>
                  <th className="fw-medium border-0">Doctor</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.map((patient: Patient) => (
                  <tr key={patient.id}>
                    <td className="px-4 fw-semibold text-dark">{patient.name}</td>
                    <td>{patient.age}</td>
                    <td>{patient.gender}</td>
                    <td>
                      <Badge bg="danger" className="rounded-pill opacity-75">
                        {patient.blood_type}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="info" text="dark" className="rounded-pill bg-opacity-25 border border-info border-opacity-25">
                        {patient.medical_condition}
                      </Badge>
                    </td>
                    <td className="text-muted small">{patient.date_of_admission}</td>
                    <td>{patient.doctor}</td>
                  </tr>
                ))}
                {(!data.data || data.data.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-muted">No patients found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>

      {!loading && !ransomed && !error && data && data.total > 0 && (
        <Card.Footer className="bg-white border-top-0 px-4 pb-4 pt-0">
          <Row className="align-items-center">
            <Col md={6}>
              <span className="text-muted small">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} entries
              </span>
            </Col>
            <Col md={6}>{renderPagination()}</Col>
          </Row>
        </Card.Footer>
      )}
    </Card>
  );
};
