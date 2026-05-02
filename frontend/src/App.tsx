import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { BlueTeamDashboard } from './components/BlueTeamDashboard';

const App = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return (
    <>
      {currentPath === '/blue-team' ? <BlueTeamDashboard /> : <Dashboard />}
    </>
  );
};

export default App;
