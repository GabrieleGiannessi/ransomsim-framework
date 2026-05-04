import React from 'react';
import { Card, Badge, Alert } from 'react-bootstrap';
import { FiActivity, FiCheckCircle, FiXCircle, FiClock, FiShieldOff } from 'react-icons/fi';

interface Step {
  ability?: {
    name: string;
    technique_id: string;
    technique_name: string;
  };
  status: number;
  finish: string;
  id: string;
}

interface AttackTimelineProps {
  chain: Step[];
  calderaState: string;
}

export const AttackTimeline: React.FC<AttackTimelineProps> = ({ chain, calderaState }) => {
  const isFinished = calderaState === 'finished' || calderaState === 'stopped';
  const stepsCompleted = chain.length;
  const stepsFailed = chain.filter(c => c.status > 0).length;
  const stepsSuccess = stepsCompleted - stepsFailed;

  return (
    <Card bg="dark" border="danger" className="shadow-lg h-100" style={{ borderColor: '#ff4c4c' }}>
      <Card.Header className="bg-transparent border-bottom border-danger py-3">
        <h5 className="mb-0 fw-bold text-danger d-flex align-items-center">
          <FiActivity className="me-2" size={24} />
          Execution Timeline
        </h5>
      </Card.Header>
      <Card.Body className="text-light" style={{ overflowY: 'auto', maxHeight: '600px' }}>
        
        {chain.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted opacity-50">
            <FiShieldOff size={48} className="mb-3" />
            <p className="mb-0">Awaiting Operation...</p>
          </div>
        ) : (
          <div className="timeline-container position-relative ps-3 border-start border-danger">
            {chain.map((step, index) => (
              <div key={step.id || index} className="mb-4 position-relative">
                <div 
                  className="position-absolute rounded-circle bg-dark border"
                  style={{
                    width: '12px', height: '12px', left: '-20px', top: '5px',
                    borderColor: step.status === 0 ? '#198754' : '#dc3545',
                    borderWidth: '2px'
                  }}
                ></div>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <h6 className="fw-bold mb-0 text-white">
                    {step.ability?.name || 'Unknown Step'}
                  </h6>
                  <Badge bg={step.status === 0 ? 'success' : 'danger'}>
                    {step.status === 0 ? <FiCheckCircle className="me-1" /> : <FiXCircle className="me-1" />}
                    {step.status === 0 ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </div>
                <div className="d-flex align-items-center small text-muted">
                  <Badge bg="secondary" className="me-2 text-dark bg-opacity-75">{step.ability?.technique_id}</Badge>
                  <span className="me-3">{step.ability?.technique_name}</span>
                  <FiClock className="me-1" />
                  <span>{new Date(step.finish).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isFinished && chain.length > 0 && (
          <Alert variant="danger" className="mt-4 bg-transparent border border-danger text-danger">
            <Alert.Heading className="fs-5 fw-bold"><FiCheckCircle className="me-2" />Operation Concluded</Alert.Heading>
            <hr className="border-danger opacity-25" />
            <div className="d-flex justify-content-between">
              <div><strong>Steps Executed:</strong> {stepsCompleted}</div>
              <div className="text-success"><strong>Success:</strong> {stepsSuccess}</div>
              <div className="text-danger"><strong>Failed:</strong> {stepsFailed}</div>
            </div>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};
