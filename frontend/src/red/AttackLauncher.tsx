import React, { useState } from 'react';
import { Card, Button, Form, ProgressBar, Badge } from 'react-bootstrap';
import { FiCrosshair, FiPlay, FiCpu } from 'react-icons/fi';

interface Adversary {
  adversary_id: string;
  name: string;
  description: string;
}

interface AttackLauncherProps {
  onLaunch: (adversaryId: string, group: string) => void;
  status: string;
  calderaState: string;
  adversaries: Adversary[];
  error: string | null;
}

export const AttackLauncher: React.FC<AttackLauncherProps> = ({ onLaunch, status, calderaState, adversaries, error }) => {
  const [adversaryId, setAdversaryId] = useState('');
  const [group, setGroup] = useState('red_team');

  // Auto-select 'Healthcare Ransomware' if available, otherwise first option
  React.useEffect(() => {
    if (!adversaryId && adversaries.length > 0) {
      const target = adversaries.find(a => a.name.toLowerCase() === 'healthcare ransomware') || adversaries[0];
      setAdversaryId(target.adversary_id);
    }
  }, [adversaries, adversaryId]);

  const isRunning = status === 'running' || calderaState === 'running';

  return (
    <Card bg="dark" border="danger" className="shadow-lg h-100" style={{ borderColor: '#ff4c4c' }}>
      <Card.Header className="bg-danger text-white border-bottom-0 py-3" style={{ background: 'linear-gradient(90deg, #b00020 0%, #ff4c4c 100%)' }}>
        <h5 className="mb-0 fw-bold d-flex align-items-center">
          <FiCrosshair className="me-2" size={24} />
          Attack Launcher
        </h5>
      </Card.Header>
      <Card.Body className="text-light">
        <Form>
          <Form.Group className="mb-4">
            <Form.Label className="text-danger fw-bold text-uppercase small tracking-wide">Target Group</Form.Label>
            <Form.Select 
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              disabled={isRunning}
              className="bg-dark text-white border-secondary shadow-none custom-select"
            >
              <option value="red_team">Hospital Network (red_team)</option>
              <option value="windows">Windows Hosts (windows)</option>
              <option value="linux">Linux Servers (linux)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="text-danger fw-bold text-uppercase small tracking-wide">Adversary Profile</Form.Label>
            <Form.Select 
              value={adversaryId}
              onChange={(e) => setAdversaryId(e.target.value)}
              disabled={isRunning || adversaries.length === 0}
              className="bg-dark text-white border-secondary shadow-none custom-select"
            >
              {adversaries.length === 0 ? (
                <option value="">Loading profiles...</option>
              ) : (
                adversaries.map(adv => (
                  <option 
                    key={adv.adversary_id} 
                    value={adv.adversary_id}
                    disabled={adv.name.toLowerCase() !== 'healthcare ransomware'}
                  >
                    {adv.name} {adv.name.toLowerCase() !== 'healthcare ransomware' ? ' (Locked)' : ''}
                  </option>
                ))
              )}
            </Form.Select>
            {adversaries.length > 0 && adversaryId && (
              <Form.Text className="text-white small mt-2 d-block">
                {adversaries.find(a => a.adversary_id === adversaryId)?.description}
              </Form.Text>
            )}
          </Form.Group>

          {error && (
            <div className="alert alert-danger py-2 px-3 small border-0 mb-4 bg-danger bg-opacity-10 text-danger">
              <FiCpu className="me-2" />
              <strong>Validation Error:</strong> {error}
            </div>
          )}

          <div className="d-grid mt-5">
            <Button 
              variant={isRunning ? "outline-danger" : "danger"}
              size="lg"
              className="fw-bold text-uppercase glowing-btn d-flex align-items-center justify-content-center"
              onClick={() => onLaunch(adversaryId, group)}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <FiCpu className="me-2 spinning" size={24} />
                  Attack in Progress...
                </>
              ) : (
                <>
                  <FiPlay className="me-2" size={24} />
                  Launch Attack
                </>
              )}
            </Button>
          </div>

          {isRunning && (
            <div className="mt-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="small text-danger">Caldera Status:</span>
                <Badge bg="danger" className="text-uppercase">{calderaState}</Badge>
              </div>
              <ProgressBar animated variant="danger" now={100} style={{ height: '8px' }} />
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
};
