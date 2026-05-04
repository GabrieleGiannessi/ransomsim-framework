import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { BlueTeamDashboard } from './components/BlueTeamDashboard';
import { RedDashboard } from './red/Dashboard';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/blue-team" element={<BlueTeamDashboard />} />
        <Route path="/red" element={<RedDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
