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
  const [simStatus, setSimStatus] = useState('idle');
  const [calderaState, setCalderaState] = useState('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

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
        if (data.type === 'status') {
          setSimStatus(data.data);
        } else if (data.text) {
          setLogs(prev => [...prev, data]);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error', error);
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
        console.error('Status polling failed', error);
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleStartAttack = async () => {
    setSimStatus('running');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiUrl}/sim/start-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adversary_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          group: 'red_team'
        })
      });
    } catch (e) {
      setSimStatus('idle');
      console.error('Failed to start attack', e);
    }
  };

  const handleStopAttack = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiUrl}/sim/stop-attack`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to stop attack', e);
    }
  };

  const getStatusColor = () => {
    if (simStatus === 'running') return 'danger';
    if (
      calderaState !== 'idle' &&
      calderaState !== 'finished' &&
      calderaState !== 'stopped'
    ) return 'warning';
    return 'success';
  };

  return (
    <Container fluid className="p-4" style={{ backgroundColor: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>

      {/* Top Navbar Area */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="text-white mb-0">
            <FiShield className="me-2 text-info" />
            SOC Blue Team Dashboard
          </h2>
          <p className="text-muted mb-0">Ransomware Incident Response Center</p>
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" size="sm" onClick={() => window.location.href = '/'}>
            ← Back to Main Dashboard
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        {/* System Status */}
        <Col md={4}>
          <Card bg="dark" border="secondary" className="h-100">
            <Card.Body>
              <Card.Title className="text-white">
                <FiActivity className="me-2" />
                System Status
              </Card.Title>
              <Badge bg={getStatusColor()} className="fs-6 p-2">
                {simStatus === 'running' ? 'Under Attack' : 'Secure'}
              </Badge>
            </Card.Body>
          </Card>
        </Col>

        {/* Simulation Controls */}
        <Col md={8}>
          <Card bg="dark" border="secondary" className="h-100">
            <Card.Body>
              <Card.Title className="text-white">
                <FiAlertTriangle className="me-2" />
                Simulation Controls
              </Card.Title>
              <p className="text-muted mb-3">Caldera State: <strong className="text-white">{calderaState}</strong></p>
              <div className="d-flex gap-2">
                <Button
                  variant="danger"
                  onClick={handleStartAttack}
                  disabled={simStatus === 'running'}
                >
                  Simulate Attack
                </Button>
                <Button
                  variant="success"
                  onClick={handleStopAttack}
                  disabled={simStatus !== 'running'}
                >
                  <FiXCircle className="me-1" />
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
          <Card bg="dark" border="secondary">
            <Card.Body>
              <Card.Title className="text-white">
                <FiActivity className="me-2" />
                Live FastAPI Server Logs
              </Card.Title>
              <div
                style={{
                  backgroundColor: '#010409',
                  borderRadius: '6px',
                  padding: '1rem',
                  height: '400px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              >
                {logs.length === 0 ? (
                  <span className="text-muted">Waiting for logs...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-muted">
                        [{log.record?.time?.repr || new Date().toISOString()}]
                      </span>{' '}
                      <Badge
                        bg={log.record?.level?.name === 'ERROR' ? 'danger' : log.record?.level?.name === 'WARNING' ? 'warning' : 'info'}
                        className="me-1"
                      >
                        {log.record?.level?.name || 'INFO'}
                      </Badge>
                      <span className="text-light">{log.record?.message || log.text}</span>
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
  );
};