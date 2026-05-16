import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table } from 'react-bootstrap';
import { FiShield, FiActivity, FiDatabase, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { API_BASE_URL, WS_BASE_URL } from '../api/config';

interface Alert {
  id: string | number;
  timestamp: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  signature: string;
  src_ip: string;
  dest_ip: string;
  proto: string;
  action: string;
}

const SEVERITY_STYLE: Record<string, { color: string; bg: string; glow: string }> = {
  high:   { color: '#FF3131', bg: 'rgba(255, 49, 49, 0.25)', glow: '0 0 20px rgba(255, 49, 49, 0.6)' },
  medium: { color: '#FFD700', bg: 'rgba(255, 215, 0, 0.25)', glow: '0 0 20px rgba(255, 215, 0, 0.5)' },
  low:    { color: '#00F0FF', bg: 'rgba(0, 240, 255, 0.25)', glow: '0 0 20px rgba(0, 240, 255, 0.4)' },
  info:   { color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.15)', glow: 'none' },
};

export const BlueTeamDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [simStatus, setSimStatus] = useState('idle');
  const [calderaState, setCalderaState] = useState('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [alerts]);

  // WebSocket Connection
  useEffect(() => {
    const connect = () => {
      const url = `${WS_BASE_URL}/alerts/ws`;
      setWsStatus('connecting');

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('connected');

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'snapshot') {
            setAlerts(data.alerts.reverse());
          } else if (data.id) {
            setAlerts(prev => [...prev, data]);
          }
        } catch (e) {
          console.error('[SOC] Parse error', e);
        }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connect, 3000);
      };

      ws.onerror = () => setWsStatus('disconnected');
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  // Poll Stats
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/sim/status`);
        if (res.ok) {
          const data = await res.json();
          setSimStatus(data.status);
          setCalderaState(data.caldera_state || 'idle');
        }
      } catch (e) { console.error(e); }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 3000);
    return () => clearInterval(id);
  }, []);

  const handleClear = async () => {
    await fetch(`${API_BASE_URL}/alerts/`, { method: 'DELETE' });
    setAlerts([]);
  };

  return (
    <Container fluid className="p-4 min-vh-100" style={{ backgroundColor: '#020408', color: '#FFFFFF' }}>
      
      {/* HEADER */}
      <Row className="mb-4 align-items-center border-bottom border-primary border-opacity-25 pb-3">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 rounded bg-primary bg-opacity-20 border border-primary border-opacity-50 shadow-lg">
              <FiShield className="text-primary fs-3" />
            </div>
            <div>
              <h2 className="text-white fw-bold mb-0" style={{ letterSpacing: '2px', textShadow: '0 0 10px rgba(0, 123, 255, 0.5)' }}>BLUE TEAM SOC</h2>
              <div className="d-flex align-items-center gap-2">
                <div 
                  className={`rounded-circle ${wsStatus === 'connected' ? 'bg-success' : 'bg-danger'}`} 
                  style={{ width: '10px', height: '10px', boxShadow: wsStatus === 'connected' ? '0 0 10px #28a745' : '0 0 10px #dc3545' }}
                />
                <span className={`small fw-bold text-uppercase tracking-widest ${wsStatus === 'connected' ? 'text-success' : 'text-danger'}`}>
                  {wsStatus === 'connected' ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE / RECONNECTING'}
                </span>
              </div>
            </div>
          </div>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button variant="outline-light" size="sm" className="fw-bold border-2" onClick={() => window.location.href = '/'}>
            EXIT TO MAIN
          </Button>
          <Button variant="danger" size="sm" className="fw-bold" onClick={handleClear}>
            <FiRefreshCw className="me-1" /> PURGE ALERTS
          </Button>
        </Col>
      </Row>

      {/* KPI CARDS */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card style={{ backgroundColor: '#0d1117', border: '2px solid #30363d', boxShadow: simStatus === 'running' ? 'inset 0 0 15px rgba(220, 53, 69, 0.2)' : 'none' }}>
            <Card.Body>
              <div className="small text-white-50 text-uppercase fw-bold mb-2">Operation Status</div>
              <Badge 
                bg={simStatus === 'running' ? 'danger' : 'success'} 
                className="fs-5 p-3 w-100 mb-2 border border-white border-opacity-25 shadow-sm"
              >
                {simStatus === 'running' ? '⚠ UNDER ATTACK' : '✓ SECURE'}
              </Badge>
              <div className="text-white fw-bold small">Caldera Node: <span className="text-info">{calderaState.toUpperCase()}</span></div>
            </Card.Body>
          </Card>
        </Col>

        {['high', 'medium', 'low'].map(s => (
          <Col md={3} key={s}>
            <Card style={{ backgroundColor: '#0d1117', border: `2px solid ${SEVERITY_STYLE[s].color}66`, boxShadow: `inset 0 0 10px ${SEVERITY_STYLE[s].color}11` }}>
              <Card.Body className="text-center">
                <div className="small text-white-50 text-uppercase fw-bold mb-1">{s} Severity</div>
                <div className="display-4 fw-bold" style={{ color: SEVERITY_STYLE[s].color, textShadow: SEVERITY_STYLE[s].glow }}>
                  {alerts.filter(a => a.severity === s).length}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* TRAFFIC TABLE */}
      <Card style={{ backgroundColor: '#0d1117', border: '2px solid #30363d', borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Header className="bg-dark bg-opacity-70 border-bottom border-secondary d-flex justify-content-between align-items-center py-3">
          <span className="fw-bold text-white fs-5">
            <FiActivity className="text-info me-2" /> 
            LIVE IDS SENSOR FEED
          </span>
          <Badge bg="primary" className="px-3 py-2 fw-bold" style={{ fontSize: '0.9rem' }}>{alerts.length} DETECTED EVENTS</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <div ref={scrollRef} style={{ height: '550px', overflowY: 'auto', backgroundColor: '#010409' }}>
            <Table variant="dark" hover className="mb-0" style={{ fontSize: '1rem' }}>
              <thead className="text-white small text-uppercase" style={{ position: 'sticky', top: 0, backgroundColor: '#161b22', zIndex: 10, borderBottom: '2px solid #30363d' }}>
                <tr>
                  <th className="ps-4 py-3" style={{ width: '140px' }}>Timestamp</th>
                  <th style={{ width: '120px' }}>Priority</th>
                  <th>Signature / Detection Rule</th>
                  <th style={{ width: '160px' }}>Source Node</th>
                  <th style={{ width: '160px' }}>Target Node</th>
                  <th style={{ width: '100px' }}>Protocol</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="py-5" style={{ color: '#FFFFFF' }}>
                        <FiDatabase size={60} className="mb-3 text-primary opacity-50" />
                        <h4 className="fw-bold">SENSOR IDLE</h4>
                        <p className="text-white-50">Monitoring network interfaces... No threats detected.</p>
                        {wsStatus !== 'connected' && (
                          <div className="d-flex align-items-center justify-content-center gap-2 text-danger fw-bold mt-4 animate-pulse">
                            <FiAlertCircle /> ATTEMPTING TO CONNECT TO IDS FEED...
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  alerts.map((a, i) => (
                    <tr key={i} className="border-bottom border-white border-opacity-10 align-middle">
                      <td className="ps-4 text-white-50 fw-bold" style={{ fontFamily: 'monospace' }}>
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <Badge 
                          style={{ 
                            backgroundColor: SEVERITY_STYLE[a.severity].bg, 
                            color: SEVERITY_STYLE[a.severity].color,
                            border: `2px solid ${SEVERITY_STYLE[a.severity].color}`,
                            fontSize: '0.8rem',
                            padding: '6px 12px'
                          }}
                        >
                          {a.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="text-white fw-bold">{a.signature}</td>
                      <td style={{ color: '#58a6ff', fontFamily: 'monospace', fontWeight: 'bold' }}>{a.src_ip}</td>
                      <td style={{ color: '#d29922', fontFamily: 'monospace', fontWeight: 'bold' }}>{a.dest_ip}</td>
                      <td><Badge bg="dark" className="border border-secondary px-2 py-1">{a.proto.toUpperCase()}</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <style>{`
        .animate-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #010409; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 5px; border: 2px solid #010409; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        .table-hover tbody tr:hover { background-color: rgba(255, 255, 255, 0.03) !important; }
      `}</style>
    </Container>
  );
};