import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Navbar, Button } from 'react-bootstrap';
import { AttackLauncher } from './AttackLauncher';
import { AttackTimeline } from './AttackTimeline';
import { FiTerminal } from 'react-icons/fi';
import './red.css'; // We will add some custom css for aesthetics

export const RedDashboard: React.FC = () => {
  const [simStatus, setSimStatus] = useState('idle');
  const [calderaState, setCalderaState] = useState('idle');
  const [chain, setChain] = useState([]);

  // Poll Backend Status
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/sim/status`);
        if (response.ok) {
          const data = await response.json();
          setSimStatus(data.status);
          setCalderaState(data.caldera_state || 'idle');
          if (data.chain) {
            setChain(data.chain);
          }
        }
      } catch (error) {
        console.error('Status polling failed', error);
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const handleLaunchAttack = async (adversaryId: string, group: string) => {
    setSimStatus('running');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiUrl}/sim/start-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adversary_id: adversaryId,
          group: group
        })
      });
    } catch (e) {
      setSimStatus('idle');
      console.error('Failed to start attack', e);
    }
  };

  return (
    <div className="red-team-theme min-vh-100 pb-5" style={{ backgroundColor: '#0a0a0a' }}>
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
        <Row className="g-4">
          <Col lg={4}>
            <AttackLauncher 
              onLaunch={handleLaunchAttack} 
              status={simStatus} 
              calderaState={calderaState} 
            />
          </Col>
          <Col lg={8}>
            <AttackTimeline 
              chain={chain} 
              calderaState={calderaState} 
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};
