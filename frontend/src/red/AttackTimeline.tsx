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
  // Deduplicate chain: if an ability was retried, prefer the successful/finished one
  const filteredChain = chain.reduce((acc: Step[], curr) => {
    const existing = acc.find(s => s.ability?.technique_id === curr.ability?.technique_id);
    if (!existing) {
      acc.push(curr);
    } else if (curr.status === 0 || (existing.status < 0 && curr.status >= 0)) {
      // Replace existing stale/running link with the newer/successful one
      return acc.map(s => s.ability?.technique_id === curr.ability?.technique_id ? curr : s);
    }
    return acc;
  }, []);

  const isFinished = calderaState === 'finished' || calderaState === 'stopped';
  const stepsSuccess = filteredChain.filter(c => c.status === 0).length;
  const stepsFailed = filteredChain.filter(c => c.status > 0).length;
  const stepsPending = filteredChain.filter(c => c.status < 0).length;

  return (
    <Card bg="dark" border="danger" className="shadow-lg h-100" style={{ borderColor: '#ff4c4c' }}>
      <Card.Header className="bg-transparent border-bottom border-danger py-3">
        <h5 className="mb-0 fw-bold text-danger d-flex align-items-center">
          <FiActivity className="me-2" size={24} />
          Execution Timeline
        </h5>
      </Card.Header>
      <Card.Body className="text-light" style={{ overflowY: 'auto', maxHeight: '600px' }}>
        
        {filteredChain.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-white opacity-50">
            {calderaState === 'running' ? (
              <>
                <FiActivity size={48} className="mb-3 pulse-red" />
                <p className="mb-0">Initializing Caldera Operation...</p>
              </>
            ) : (
              <>
                <FiShieldOff size={48} className="mb-3" />
                <p className="mb-0">Awaiting Operation...</p>
              </>
            )}
          </div>
        ) : (
          <div className="timeline-container position-relative ps-3 border-start border-danger">
            {filteredChain.map((step, index) => (
              <div key={step.id || index} className="mb-4 position-relative">
                <div 
                  className="position-absolute rounded-circle bg-dark border"
                  style={{
                    width: '12px', height: '12px', left: '-20px', top: '5px',
                  borderColor: step.status === 0 ? '#198754' : (step.status < 0 ? '#ffc107' : '#dc3545'),
                  borderWidth: '2px',
                  boxShadow: step.status < 0 ? '0 0 10px #ffc107' : 'none'
                  }}
                ></div>
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <h6 className="fw-bold mb-0 text-white">
                    {step.ability?.name || 'Unknown Step'}
                  </h6>
                  <Badge bg={step.status === 0 ? 'success' : (step.status < 0 ? 'warning' : 'danger')}>
                    {step.status === 0 && <FiCheckCircle className="me-1" />}
                    {step.status < 0 && <FiClock className="me-1" />}
                    {step.status > 0 && <FiXCircle className="me-1" />}
                    
                    {step.status === 0 ? 'SUCCESS' : (step.status < 0 ? 'RUNNING' : 'FAILED')}
                  </Badge>
                </div>
                <div className="d-flex align-items-center small text-white">
                  <Badge bg="secondary" className="me-2 text-white">{step.ability?.technique_id}</Badge>
                  <span className="me-3">{step.ability?.technique_name}</span>
                  <FiClock className="me-1" />
                  <span>
                    {step.finish && step.finish !== "0001-01-01T00:00:00Z" 
                      ? new Date(step.finish).toLocaleTimeString() 
                      : 'In Progress...'}
                  </span>
                </div>
              </div>
            ))}
            {calderaState === 'running' && (
              <div className="mb-4 position-relative opacity-75">
                <div 
                  className="position-absolute rounded-circle bg-danger pulse-red"
                  style={{ width: '12px', height: '12px', left: '-20px', top: '5px' }}
                ></div>
                <h6 className="fw-bold mb-1 text-danger">Executing next step...</h6>
                <div className="small text-white italic">Polling Caldera for results...</div>
              </div>
            )}
          </div>
        )}

        {isFinished && filteredChain.length > 0 && (
          <Alert variant="danger" className="mt-4 bg-transparent border border-danger text-danger">
            <Alert.Heading className="fs-5 fw-bold"><FiCheckCircle className="me-2" />Operation Concluded</Alert.Heading>
            <hr className="border-danger opacity-25" />
            <div className="d-flex justify-content-between">
              <div><strong>Executed:</strong> {stepsSuccess + stepsFailed}</div>
              <div className="text-success"><strong>Success:</strong> {stepsSuccess}</div>
              <div className="text-warning"><strong>Pending:</strong> {stepsPending}</div>
              <div className="text-danger"><strong>Failed:</strong> {stepsFailed}</div>
            </div>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};
