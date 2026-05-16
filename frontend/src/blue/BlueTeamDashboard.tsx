import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table } from 'react-bootstrap';
import { FiShield, FiAlertTriangle, FiActivity, FiXCircle, FiWifi, FiWifiOff } from 'react-icons/fi';
import { API_BASE_URL, WS_BASE_URL } from '../api/config';

interface Alert {
  id: string | number;
  timestamp: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  signature: string;
  signature_id?: number;
  src_ip: string;
  dest_ip: string;
  proto: string;
  action: string;
  category?: string;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  high:   { bg: 'danger',  text: '#ff4c4c', label: 'HIGH' },
  medium: { bg: 'warning', text: '#ffc107', label: 'MED' },
  low:    { bg: 'info',    text: '#0dcaf0', label: 'LOW' },
  info:   { bg: 'secondary', text: '#adb5bd', label: 'INFO' },
};

const AlertRow: React.FC<{ alert: Alert; isNew: boolean }> = ({ alert, isNew }) => {
  const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
  const needsGlow = alert.severity === 'high' || alert.severity === 'medium';

  return (
    <tr
      style={{
        animation: isNew ? 'alert-slide-in 0.35s ease-out' : undefined,
        boxShadow: isNew && needsGlow
          ? `inset 0 0 12px 0 ${sev.text}55`
          : undefined,
        transition: 'box-shadow 0.5s',
        fontSize: '0.8rem',
      }}
    >
      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
        {new Date(alert.timestamp).toLocaleTimeString()}
      </td>
      <td>
        <Badge bg={sev.bg} className="px-2 py-1 fw-bold" style={{ fontSize: '0.7rem' }}>
          {sev.label}
        </Badge>
      </td>
      <td className="text-light" style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {alert.signature}
      </td>
      <td className="text-info" style={{ fontFamily: 'monospace' }}>{alert.src_ip}</td>
      <td className="text-warning" style={{ fontFamily: 'monospace' }}>{alert.dest_ip}</td>
      <td><Badge bg="secondary" style={{ fontSize: '0.65rem' }}>{alert.proto}</Badge></td>
      <td>
        <span style={{ color: alert.action === 'allowed' ? '#6c757d' : '#ff4c4c', fontSize: '0.75rem' }}>
          {alert.action}
        </span>
      </td>
    </tr>
  );
};

export const BlueTeamDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlertIds, setNewAlertIds] = useState<Set<string | number>>(new Set());
  const [simStatus, setSimStatus] = useState('idle');
  const [calderaState, setCalderaState] = useState('idle');
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tableEndRef = useRef<HTMLTableRowElement | null>(null);

  // Auto-scroll to newest alert
  useEffect(() => {
    tableEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [alerts]);

  // WebSocket: IDS Alerts from Suricata via /alerts/ws
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`${WS_BASE_URL}/alerts/ws`);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // On connect: backend sends a snapshot of recent alerts
          if (data.type === 'snapshot' && Array.isArray(data.alerts)) {
            setAlerts(data.alerts.reverse()); // oldest first
            return;
          }

          // Real-time single alert push
          if (data.id !== undefined) {
            setAlerts(prev => [...prev, data as Alert]);
            setNewAlertIds(prev => {
              const next = new Set(prev);
              next.add(data.id);
              // Remove the "new" flag after animation completes
              setTimeout(() => {
                setNewAlertIds(s => { const ns = new Set(s); ns.delete(data.id); return ns; });
              }, 1500);
              return next;
            });
          }
        } catch (e) {
          console.error('[alerts-ws] Failed to parse message', e);
        }
      };

      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => {
        setWsConnected(false);
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  // Poll Caldera/Simulation status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sim/status`);
        if (response.ok) {
          const data = await response.json();
          setSimStatus(data.status);
          setCalderaState(data.caldera_state || 'idle');
        }
      } catch { /* silent */ }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 3000);
    return () => clearInterval(id);
  }, []);

  const handleStopAttack = async () => {
    try {
      await fetch(`${API_BASE_URL}/sim/stop-attack`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to stop attack', e);
    }
  };

  const handleClearAlerts = async () => {
    try {
      await fetch(`${API_BASE_URL}/alerts/`, { method: 'DELETE' });
      setAlerts([]);
    } catch (e) {
      console.error('Failed to clear alerts', e);
    }
  };

  const getStatusColor = () => {
    if (simStatus === 'running') return 'danger';
    if (calderaState !== 'idle' && calderaState !== 'finished' && calderaState !== 'stopped') return 'warning';
    return 'success';
  };

  const countBySeverity = (sev: string) => alerts.filter(a => a.severity === sev).length;

  return (
    <>
      {/* Inject keyframe animation once */}
      <style>{`
        @keyframes alert-slide-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <Container fluid className="p-4" style={{ backgroundColor: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>

        {/* Header */}
        <Row className="mb-4 align-items-center">
          <Col>
            <h2 className="text-white mb-0">
              <FiShield className="me-2 text-info" />
              SOC Blue Team Dashboard
            </h2>
            <p className="text-muted mb-0">Ransomware Incident Response Center</p>
          </Col>
          <Col xs="auto" className="d-flex align-items-center gap-3">
            {wsConnected
              ? <span className="small text-success d-flex align-items-center gap-1"><FiWifi /> IDS Live</span>
              : <span className="small text-danger d-flex align-items-center gap-1"><FiWifiOff /> Reconnecting…</span>
            }
            <Button variant="outline-secondary" size="sm" onClick={() => window.location.href = '/'}>
              ← Back to Main Dashboard
            </Button>
          </Col>
        </Row>

        {/* Status & Controls */}
        <Row className="mb-4 g-3">
          <Col md={3}>
            <Card bg="dark" border="secondary" className="h-100">
              <Card.Body>
                <Card.Title className="text-white small text-uppercase fw-bold">
                  <FiActivity className="me-2" />System Status
                </Card.Title>
                <Badge bg={getStatusColor()} className="fs-6 p-2">
                  {simStatus === 'running' ? '⚠ Under Attack' : '✓ Secure'}
                </Badge>
                <div className="text-muted small mt-2">Caldera: <strong className="text-white">{calderaState}</strong></div>
              </Card.Body>
            </Card>
          </Col>

          {/* Alert KPI counters */}
          {(['high', 'medium', 'low'] as const).map(sev => (
            <Col md={2} key={sev}>
              <Card bg="dark" border="secondary" className="h-100 text-center">
                <Card.Body className="d-flex flex-column justify-content-center">
                  <div className="display-6 fw-bold" style={{ color: SEVERITY_CONFIG[sev].text }}>
                    {countBySeverity(sev)}
                  </div>
                  <div className="text-muted small text-uppercase">{sev} alerts</div>
                </Card.Body>
              </Card>
            </Col>
          ))}

          {/* Controls */}
          <Col>
            <Card bg="dark" border="secondary" className="h-100">
              <Card.Body className="d-flex flex-column justify-content-center">
                <Card.Title className="text-white small text-uppercase fw-bold">
                  <FiAlertTriangle className="me-2" />Controls
                </Card.Title>
                <div className="d-flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleStopAttack}
                    disabled={simStatus !== 'running'}
                  >
                    <FiXCircle className="me-1" /> Block Attack
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={handleClearAlerts}>
                    Clear Alerts
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* IDS Alert Table */}
        <Row>
          <Col>
            <Card bg="dark" border="secondary">
              <Card.Header className="d-flex justify-content-between align-items-center py-3">
                <span className="text-white fw-bold">
                  <FiActivity className="me-2 text-info" />
                  IDS Real-Time Alerts
                </span>
                <Badge bg="secondary">{alerts.length} events</Badge>
              </Card.Header>
              <Card.Body className="p-0">
                <div style={{ height: '500px', overflowY: 'auto' }}>
                  {alerts.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                      <FiShield size={40} className="mb-3 opacity-25" />
                      <span>Waiting for Suricata alerts…</span>
                      <span className="small mt-1">
                        {wsConnected ? 'WebSocket connected — no events yet' : 'Connecting to IDS feed…'}
                      </span>
                    </div>
                  ) : (
                    <Table
                      variant="dark"
                      hover
                      responsive
                      size="sm"
                      className="mb-0"
                      style={{ borderCollapse: 'separate', borderSpacing: 0 }}
                    >
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#161b22', zIndex: 1 }}>
                        <tr className="text-muted small text-uppercase">
                          <th style={{ width: '90px' }}>Time</th>
                          <th style={{ width: '70px' }}>Severity</th>
                          <th>Signature</th>
                          <th style={{ width: '130px' }}>Src IP</th>
                          <th style={{ width: '130px' }}>Dst IP</th>
                          <th style={{ width: '60px' }}>Proto</th>
                          <th style={{ width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map(alert => (
                          <AlertRow
                            key={`${alert.id}-${alert.timestamp}`}
                            alert={alert}
                            isNew={newAlertIds.has(alert.id)}
                          />
                        ))}
                        <tr ref={tableEndRef} />
                      </tbody>
                    </Table>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

      </Container>
    </>
  );
};