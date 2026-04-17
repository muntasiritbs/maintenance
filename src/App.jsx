import { useState } from 'react';
import { useNavigate, Routes, Route, HashRouter } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Case from './Case.jsx';
import UsageReading from './UsageReading.jsx';
import Equipment from './Equipment.jsx';
import CameraCapture from './CameraCapture.jsx';
import ServiceFormPopup from './ServiceFormPopup.jsx';
import AdminCase from './AdminCase.jsx';
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
        'https://td3013433.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1539&deploy=1&compid=TD3013433&ns-at=AAEJ7tMQEhNi2Xc3CYav9k8_pPhSafeNmm4d0PEd1wLqu3szhZI',
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
        localStorage.setItem('userEmail', email);
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
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* Layer 1 — Construction photo, blurred */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'url("https://td3013433.app.netsuite.com/core/media/media.nl?id=8227&c=TD3013433&h=NYw_atLMhGbIOLivrv4exEQ73ZoXxQAhXGiNwdz0OfK0R0FT")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(1px)',
        transform: 'scale(1.08)',
      }} />

      {/* Layer 2 — Orange construction tint */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(135deg, rgba(249,115,22,0.55) 0%, rgba(194,65,12,0.65) 60%, rgba(28,25,23,0.75) 100%)',
      }} />

      {/* Layer 3 — Login form (sharp, above blur) */}
      <div id="login-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="oj-panel">
          <img
            src="https://td3013433.app.netsuite.com/core/media/media.nl?id=8189&c=TD3013433&h=dJaok088VJE8_iB3MvKf8PdJCZ1AGrhPFGB6J-J8c0L3iWRW"
            alt="Profix Logo"
          />
          <h2 className="login-page-box-title">Log In</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
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

      {/* Loader overlay */}
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
        <Route path="/admin" element={<AdminCase />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
