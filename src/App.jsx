import { useState } from 'react';
import { useNavigate, Routes, Route, HashRouter } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Case from './Case.jsx';
import UsageReading from './UsageReading.jsx';
import Equipment from './Equipment.jsx';
import CameraCapture from './CameraCapture.jsx';
import ServiceFormPopup from './ServiceFormPopup.jsx';
import './App.css';
import './Responsive.css';
import './Loader.css'; // <-- Import only the CSS

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        'https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5456&deploy=1&compid=7849230&ns-at=AAEJ7tMQBsLvJSdFFcengJNkK1f5hVGglp8kP7-6ahSdU2vnZFc',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const userId = data.employeeId || 'N/A';
        const userName = data.entityId || 'User';
        const userRole = data.role || 'user';
        const userSubsidiary = data.subsidiary || 'subsidiary';
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', userName);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userSubsidiary', userSubsidiary);
        navigate('/dashboard'); // Removed alert
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to login service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundImage:
        'url("https://7849230.app.netsuite.com/core/media/media.nl?id=5349155&c=7849230&h=xbdTIx1gRp978-yLu7rYHSnTXHsZjpYtyFPQV3s0HtAZexAz")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {/* Login Form (always rendered) */}
    <div id="login-container">
      <div className="oj-panel">
        <img
          src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349154&c=7849230&h=r8r6Q3QLdsL7iVZ7rIzrM0Cuz4Z-M9vDLr6bcPgTurpep_bU"
          alt="Profix Logo"
        />
        <h2 className="login-page-box-title">Log In</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Employee email address"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              disabled={loading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" id="loginButton" disabled={loading}>
            Log In
          </button>
        </form>
        <p className="oj-text-secondary-color forgot-password">
          Forgot Password? <a href="#">Reset password</a>
        </p>
      </div>
      <div className="login-page-footer">
        Copyright © ITelligence Business Solutions
      </div>
    </div>

    {/* Loader as overlay (conditionally rendered) */}
    {loading && (
      <div className="loader-wrapper">
        <div className="loader"></div>
      </div>
    )}
  </div>
);

}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/case" element={<Case />} />
        <Route path="/serviceform" element={<ServiceFormPopup />} />
        <Route path="/usagereading" element={<UsageReading />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/camera" element={<CameraCapture />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
