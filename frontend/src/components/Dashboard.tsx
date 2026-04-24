import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { PatientTable } from './PatientTable';
import { FiUsers, FiActivity, FiClock, FiPlusCircle } from 'react-icons/fi';

export const Dashboard: React.FC = () => {
  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Top Navbar Area */}
      <div className="bg-primary text-white py-4 mb-4" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0dcaf0 100%)' }}>
        <Container>
          <Row className="align-items-center">
            <Col>
              <h2 className="fw-bold mb-0">Healthcare Analytics</h2>
              <p className="text-white-50 mb-0">Patient Data Management System</p>
            </Col>
            <Col xs="auto">
              <div className="d-flex align-items-center bg-white bg-opacity-25 px-3 py-2 rounded-pill">
                <FiClock className="me-2" />
                <span className="fw-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container>
        {/* Stat Cards */}
        <Row className="mb-4 g-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body className="p-4 d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary me-4">
                  <FiUsers size={28} />
                </div>
                <div>
                  <p className="text-muted mb-1 fw-medium text-uppercase small">Total Patients</p>
                  <h3 className="mb-0 fw-bold">55,500+</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body className="p-4 d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded-circle text-success me-4">
                  <FiActivity size={28} />
                </div>
                <div>
                  <p className="text-muted mb-1 fw-medium text-uppercase small">Active Cases</p>
                  <h3 className="mb-0 fw-bold">12,430</h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary text-white" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)' }}>
              <Card.Body className="p-4 d-flex align-items-center justify-content-between cursor-pointer">
                <div>
                  <h5 className="mb-1 fw-bold">New Admission</h5>
                  <p className="mb-0 text-white-50 small">Register a new patient</p>
                </div>
                <FiPlusCircle size={36} className="opacity-75" />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Data Table */}
        <Row>
          <Col>
            <PatientTable />
          </Col>
        </Row>
      </Container>
    </div>
  );
};
