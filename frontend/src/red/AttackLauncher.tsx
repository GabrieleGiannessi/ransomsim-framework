import React, { useState } from 'react';
import { Card, Button, Form, ProgressBar, Badge } from 'react-bootstrap';
import { FiCrosshair, FiPlay, FiCpu } from 'react-icons/fi';

interface AttackLauncherProps {
  onLaunch: (adversaryId: string, group: string) => void;
  status: string;
  calderaState: string;
}

export const AttackLauncher: React.FC<AttackLauncherProps> = ({ onLaunch, status, calderaState }) => {
  const [adversaryId, setAdversaryId] = useState('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  const [group, setGroup] = useState('red_team');

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
              disabled={isRunning}
              className="bg-dark text-white border-secondary shadow-none custom-select"
            >
              <option value="a1b2c3d4-e5f6-7890-abcd-ef1234567890">Ransomware: Data Dump & Encrypt</option>
              <option value="discovery">Discovery & Lateral Movement</option>
            </Form.Select>
          </Form.Group>

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
