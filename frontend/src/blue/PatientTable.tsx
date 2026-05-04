import React, { useState, useEffect } from 'react';
import { Table, Pagination, Form, Spinner, Badge, Card, Row, Col } from 'react-bootstrap';
import { getPatients, type Patient, type PaginatedResponse } from '../api/patientService';
import { FiSearch } from 'react-icons/fi';

export const PatientTable: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
      } catch (err: any) {
        setError('Failed to fetch patient data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [page, conditionFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConditionFilter(e.target.value);
    setPage(1); // Reset to first page on search
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
        
        {error && (
          <div className="text-center p-5 text-danger">
            {error}
          </div>
        )}

        {!loading && !error && data && (
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
                {data.data.map((patient: Patient) => (
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
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-muted">No patients found.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
      {!loading && !error && data && data.total > 0 && (
        <Card.Footer className="bg-white border-top-0 px-4 pb-4 pt-0">
          <Row className="align-items-center">
            <Col md={6}>
              <span className="text-muted small">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} entries
              </span>
            </Col>
            <Col md={6}>
              {renderPagination()}
            </Col>
          </Row>
        </Card.Footer>
      )}
    </Card>
  );
};
