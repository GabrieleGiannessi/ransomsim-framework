import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { FiShield, FiAlertTriangle, FiActivity, FiXCircle } from 'react-icons/fi';

interface LogEntry {
  text: string;
  record: {
    level: { name: string };
    message: string;
    time: { repr: string };
  };
}

export const BlueTeamDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simStatus, setSimStatus] = useState<string>('idle');
  const [calderaState, setCalderaState] = useState<string>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // WebSocket Connection
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/sim/ws/logs`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Custom message format or loguru JSON
        if (data.type === 'status') {
          setSimStatus(data.data);
        } else if (data.text) {
          setLogs(prev => [...prev, data]);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Poll Caldera Status
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/sim/status`);
        if (response.ok) {
          const data = await response.json();
          setSimStatus(data.status);
          setCalderaState(data.caldera_state || 'idle');
        }
      } catch (error) {
        console.error("Status polling failed", error);
      }
    };

    // Initial fetch
    fetchStatus();
    // Poll every 3 seconds
    const intervalId = setInterval(fetchStatus, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleStartAttack = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiUrl}/sim/start-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adversary_id: "ransomware-healthcare-profile",
          group: "red_team"
        })
      });
      // The status will update via websocket or polling
    } catch (e) {
      console.error("Failed to start attack", e);
    }
  };

  const handleStopAttack = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiUrl}/sim/stop-attack`, {
        method: 'POST'
      });
    } catch (e) {
      console.error("Failed to stop attack", e);
    }
  };

  const getStatusColor = () => {
    if (simStatus === 'running') return 'danger'; // Red
    if (calderaState !== 'idle' && calderaState !== 'finished' && calderaState !== 'stopped') return 'warning'; // Yellow
    return 'success'; // Green
  };

  return (
    <div className="bg-dark min-vh-100 pb-5 text-light">
      {/* Top Navbar Area */}
      <div className="bg-secondary bg-gradient text-white py-3 mb-4 border-bottom border-secondary">
        <Container>
          <Row className="align-items-center">
            <Col>
              <h2 className="fw-bold mb-0 d-flex align-items-center">
                <FiShield className="me-2 text-info" />
                SOC Blue Team Dashboard
              </h2>
              <p className="text-white-50 mb-0">Ransomware Incident Response Center</p>
            </Col>
            <Col xs="auto">
              <Button variant="outline-light" onClick={() => window.location.href = '/'}>
                &larr; Back to Main Dashboard
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      <Container>
        <Row className="mb-4 g-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-black text-light border border-secondary">
              <Card.Body className="p-4 d-flex align-items-center">
                <div className={`bg-${getStatusColor()} bg-opacity-25 p-3 rounded-circle text-${getStatusColor()} me-4`}>
                  <FiActivity size={28} />
                </div>
                <div>
                  <p className="text-muted mb-1 fw-medium text-uppercase small">System Status</p>
                  <h3 className={`mb-0 fw-bold text-${getStatusColor()} text-uppercase`}>
                    {simStatus === 'running' ? 'Under Attack' : 'Secure'}
                  </h3>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={8}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-black text-light border border-secondary">
              <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                <div>
                  <h5 className="mb-2 fw-bold d-flex align-items-center">
                    <FiAlertTriangle className="me-2 text-warning" />
                    Simulation Controls
                  </h5>
                  <p className="mb-0 text-white-50 small">Caldera State: <Badge bg="secondary">{calderaState}</Badge></p>
                </div>
                <div className="d-flex gap-2">
                  <Button 
                    variant="danger" 
                    size="lg" 
                    onClick={handleStartAttack} 
                    disabled={simStatus === 'running'}
                  >
                    Simulate Attack
                  </Button>
                  <Button 
                    variant="success" 
                    size="lg" 
                    onClick={handleStopAttack}
                    className="d-flex align-items-center"
                    disabled={simStatus !== 'running'}
                  >
                    <FiXCircle className="me-2" />
                    Block Attack
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Live Logs */}
        <Row>
          <Col>
            <Card className="border-0 shadow-sm rounded-4 bg-black text-light border border-secondary">
              <Card.Header className="bg-dark border-secondary py-3">
                <h5 className="mb-0 fw-bold font-monospace">Live FastAPI Server Logs</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div 
                  className="font-monospace p-3 overflow-auto" 
                  style={{ height: '500px', backgroundColor: '#0c0c0c', fontSize: '0.85rem' }}
                >
                  {logs.length === 0 ? (
                    <div className="text-muted text-center mt-5">Waiting for logs...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="mb-1 border-bottom border-dark pb-1">
                        <span className="text-secondary">[{log.record?.time?.repr || new Date().toISOString()}]</span>{' '}
                        <span className={`fw-bold text-${log.record?.level?.name === 'ERROR' ? 'danger' : 'info'}`}>
                          {log.record?.level?.name || 'INFO'}
                        </span>:{' '}
                        <span className={log.record?.level?.name === 'ERROR' ? 'text-danger' : 'text-light'}>
                          {log.record?.message || log.text}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};
