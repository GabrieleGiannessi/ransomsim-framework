import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Navbar, Button, Card, Badge, ProgressBar } from 'react-bootstrap';
import { AttackLauncher } from './AttackLauncher';
import { AttackTimeline } from './AttackTimeline';
import { FiTerminal, FiActivity, FiCheckCircle, FiXCircle, FiClock, FiTarget } from 'react-icons/fi';
import { API_BASE_URL } from '../api/config';
import './red.css';

export const RedDashboard: React.FC = () => {
  const [simStatus, setSimStatus] = useState('idle');
  const [calderaState, setCalderaState] = useState('idle');
  const [chain, setChain] = useState<any[]>([]);
  const [adversaries, setAdversaries] = useState([]);
  const [error, setError] = useState<string | null>(null);

  // Poll Backend Status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sim/status`);
        if (response.ok) {
          const data = await response.json();
          setSimStatus(data.status);
          setCalderaState(data.caldera_state || 'idle');
          if (data.chain) setChain(data.chain);
        }
      } catch (error) {
        console.error('Status polling failed', error);
      }
    };

    const fetchAdversaries = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sim/adversaries`);
        if (response.ok) {
          const data = await response.json();
          setAdversaries(data);
        }
      } catch (error) {
        console.error('Failed to fetch adversaries', error);
      }
    };

    fetchStatus();
    fetchAdversaries();
    const intervalId = setInterval(fetchStatus, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleLaunchAttack = async (adversaryId: string, group: string) => {
    setSimStatus('running');
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/sim/start-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adversary_id: adversaryId, group }),
      });
      const data = await response.json();
      if (data.status === 'error') {
        setError(data.message);
        setSimStatus('idle');
      }
    } catch (e) {
      setSimStatus('idle');
      setError('Network error: failed to connect to API');
    }
  };

  // Derive summary metrics from chain
  const totalSteps = chain.length;
  const successSteps = chain.filter(s => s.status === 0).length;
  const failedSteps  = chain.filter(s => s.status > 0).length;
  const runningSteps = chain.filter(s => s.status < 0).length;
  const progress = totalSteps > 0 ? Math.round(((successSteps + failedSteps) / totalSteps) * 100) : 0;
  const isRunning = simStatus === 'running' || calderaState === 'running';
  const isFinished = calderaState === 'finished' || calderaState === 'stopped';

  return (
    <div className="red-team-theme min-vh-100 pb-5" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Navbar */}
      <Navbar bg="dark" variant="dark" className="border-bottom border-danger py-3 mb-4 shadow" style={{ borderColor: '#ff0000 !important' }}>
        <Container fluid className="px-4">
          <Navbar.Brand className="fw-bold text-danger d-flex align-items-center">
            <FiTerminal className="me-2 fs-4" />
            <span className="fs-4 tracking-wider text-uppercase" style={{ letterSpacing: '2px' }}>Red Team Control Panel</span>
          </Navbar.Brand>
          <div className="d-flex">
            <Button variant="outline-danger" size="sm" onClick={() => window.location.href = '/'}>
              Switch to Blue Team View
            </Button>
          </div>
        </Container>
      </Navbar>

      <Container fluid className="px-4">

        {/* ── Operation Status Widget ── */}
        <Row className="mb-4 g-3">
          {/* Operational Status */}
          <Col xs={6} md={3}>
            <Card bg="dark" border="danger" className="h-100 text-center" style={{ borderColor: '#ff4c4c' }}>
              <Card.Body className="d-flex flex-column justify-content-center py-3">
                <FiTarget size={22} className={`mx-auto mb-2 ${isRunning ? 'text-danger pulse-red' : 'text-secondary'}`} />
                <div className="small text-muted text-uppercase fw-bold mb-1">Status</div>
                <Badge
                  bg={isRunning ? 'danger' : isFinished ? 'secondary' : 'dark'}
                  className="fs-6 py-2 border border-danger"
                  style={{ letterSpacing: '1px' }}
                >
                  {isRunning ? '⚡ RUNNING' : isFinished ? '■ DONE' : '○ IDLE'}
                </Badge>
                <div className="small text-muted mt-2">{calderaState}</div>
              </Card.Body>
            </Card>
          </Col>

          {/* Progress */}
          <Col xs={6} md={3}>
            <Card bg="dark" border="danger" className="h-100" style={{ borderColor: '#ff4c4c' }}>
              <Card.Body className="d-flex flex-column justify-content-center py-3">
                <div className="small text-muted text-uppercase fw-bold mb-2">
                  <FiActivity className="me-1" /> Progress
                </div>
                <div className="text-white fw-bold mb-2" style={{ fontSize: '1.5rem' }}>
                  {successSteps + failedSteps}
                  <span className="text-muted fs-6"> / {totalSteps > 0 ? totalSteps : '—'}</span>
                </div>
                <ProgressBar
                  now={progress}
                  variant="danger"
                  animated={isRunning}
                  style={{ height: '6px', backgroundColor: '#1a1a1a' }}
                />
                <div className="small text-muted mt-1">{progress}% completed</div>
              </Card.Body>
            </Card>
          </Col>

          {/* Success */}
          <Col xs={4} md={2}>
            <Card bg="dark" border="secondary" className="h-100 text-center">
              <Card.Body className="d-flex flex-column justify-content-center py-3">
                <FiCheckCircle size={20} className="mx-auto mb-1 text-success" />
                <div className="display-6 fw-bold text-success">{successSteps}</div>
                <div className="small text-muted text-uppercase">Success</div>
              </Card.Body>
            </Card>
          </Col>

          {/* Failed */}
          <Col xs={4} md={2}>
            <Card bg="dark" border="secondary" className="h-100 text-center">
              <Card.Body className="d-flex flex-column justify-content-center py-3">
                <FiXCircle size={20} className="mx-auto mb-1 text-danger" />
                <div className="display-6 fw-bold text-danger">{failedSteps}</div>
                <div className="small text-muted text-uppercase">Failed</div>
              </Card.Body>
            </Card>
          </Col>

          {/* Running */}
          <Col xs={4} md={2}>
            <Card bg="dark" border="secondary" className="h-100 text-center">
              <Card.Body className="d-flex flex-column justify-content-center py-3">
                <FiClock size={20} className={`mx-auto mb-1 ${runningSteps > 0 ? 'text-warning' : 'text-secondary'}`} />
                <div className={`display-6 fw-bold ${runningSteps > 0 ? 'text-warning' : 'text-secondary'}`}>{runningSteps}</div>
                <div className="small text-muted text-uppercase">In-flight</div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Main Layout: Launcher + Timeline ── */}
        <Row className="g-4">
          <Col lg={4}>
            <AttackLauncher
              onLaunch={handleLaunchAttack}
              status={simStatus}
              calderaState={calderaState}
              adversaries={adversaries}
              error={error}
            />
          </Col>
          <Col lg={8}>
            <AttackTimeline chain={chain} calderaState={calderaState} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};
