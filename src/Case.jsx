import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import './Dashboard.css';
import './Responsive.css';
import './App.css';
import './CaseCards.css';
import Loader from './Loader';

function Case() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state for caseType: 'reactive', 'preventive', or null (no filter)
  const [filterType, setFilterType] = useState(null);

  const userName = localStorage.getItem('userName') || 'Guest';
  const userRole = localStorage.getItem('userRole') || 'Visitor';

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const fetchCases = async () => {
    try {
      const response = await fetch(
        `https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U&action=getCases&currentUser=${encodeURIComponent(userName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('RESTlet Error Response:', text);
        throw new Error(`Server error: ${text}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch cases:', err.message);
      setError(err.message);
      return [];
    }
  };

  useEffect(() => {
  setLoading(true);
  fetchCases()
    .then(data => {
      const sortedCases = data.sort((a, b) => {
        const numA = parseInt(a.caseNumber, 10);
        const numB = parseInt(b.caseNumber, 10);
        return numB - numA;
      });
      setCases(sortedCases);
      setLoading(false);
    })
    .catch(() => setLoading(false));
}, []);


  // Filter cases based on filterType state
  const filteredCases = filterType
    ? cases.filter(c => c.caseType?.toLowerCase() === filterType)
    : cases;

  return (
    <div className="home-container">
      {/* Header */}
      <div className="header">
        <div className="header-top">
          <div className="group-one">
            <button className="sidebar-toggle" onClick={toggleSidebar}>☰</button>
          </div>
          <div className="group-two">
            <img
              src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349151&c=7849230&h=lOs1Nqhu2aEuvCVFxDsUy-U3YE3fMoRcSn3aSJi_A6qyFJ-m"
              alt="Company Logo"
              className="company-logo"
            />
            <div className="portal-title">
              <img
                src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349154&c=7849230&h=r8r6Q3QLdsL7iVZ7rIzrM0Cuz4Z-M9vDLr6bcPgTurpep_bU"
                alt="Profix Logo"
                className="portal-logo"
              />
            </div>
            <div className="user-info">
              Signed in: {userName}<br />
            </div>
          </div>
        </div>
        <div className="header-border"></div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="sidebar-header">
          <h3>Menu</h3>
          <button className="close-btn" onClick={toggleSidebar}><FaTimes /></button>
        </div>
        <ul className="sidebar-content">
          <li><a href="#dashboard">Dashboard</a></li>
          <li><a href="#case">Cases</a></li>
          <li><a href="#equipment">Equipment</a></li>
          <li><a href="#usagereading">Usage Reading</a></li>
          <li><button onClick={handleLogout}>Logout</button></li>
        </ul>
      </div>

      {isSidebarVisible && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}

      {/* Main Content */}
      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        <div className="card-main-equipment">
          <h1 className="dashboard-title">Case Management</h1>

          {/* Filter Buttons */}
      <div
        className="filter-buttons"
        style={{ margin: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
      >
        <button
          onClick={() =>
            setFilterType(prev => (prev === 'reactive' ? null : 'reactive'))
          }
          className={filterType === 'reactive' ? 'active-filter' : ''}
        >
          Reactive
        </button>
        <button
          onClick={() =>
            setFilterType(prev => (prev === 'preventive' ? null : 'preventive'))
          }
          className={filterType === 'preventive' ? 'active-filter' : ''}
        >
          Preventive
        </button>
      </div>

          {loading && <Loader />}

          {error && <p style={{ color: 'red' }}>Error: {error}</p>}

          {!loading && !error && filteredCases.length === 0 && (
            <p>No cases found for user.</p>
          )}

          <div className="case-container">
            {filteredCases.map((caseItem, index) => {
              const priorityClass =
                caseItem.priority?.toLowerCase() === 'high'
                  ? 'priority-high'
                  : caseItem.priority?.toLowerCase() === 'medium'
                  ? 'priority-medium'
                  : 'priority-low';

              return (
                <div
  key={index}
  className="case-card"
  onClick={() =>
    navigate(`/serviceform?caseNumber=${caseItem.caseNumber}&userId=${encodeURIComponent(userName)}`)}
>
  <div className={`priority-tag ${priorityClass}`}>
    {caseItem.priority || 'N/A'}
  </div>
  <img
    src={caseItem.image || 'https://via.placeholder.com/60'}
    alt="Equipment"
    className="case-image"
  />
  <div className="case-details">
    <h3>Case #{caseItem.caseNumber || 'N/A'}</h3>
    <span><b>Subject:</b> {caseItem.subject || 'N/A'}</span>
    <span><b>Equipment:</b> {caseItem.equipment || 'N/A'}</span>
    <span><b>Status:</b> {caseItem.status || 'N/A'}</span>
    <span><b>Scheduled For:</b> {caseItem.schedule || 'N/A'}</span>
    <span><b>Location:</b> {caseItem.location || 'N/A'}</span>
    <span><b>Subsidiary:</b> {caseItem.equipmentSubsidiary || 'N/A'}</span>
    <span><b>Make & Model:</b> {caseItem.makeModel || 'N/A'}</span>
    <span><b>Case Type:</b> {caseItem.caseType || 'N/A'}</span>
  </div>
</div>

              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-logo">
          <img
            src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349153&c=7849230&h=Wnp2-mOwvlhQYw9AxlcHwS3d2i2EmBAghRqJ037KL1cdycun"
            alt="Oracle NetSuite Logo"
            className="netsuite-logo"
          />
        </div>
        <p>Copyright © ITelligence Business Solutions</p>
      </div>

      {/* Inline CSS for active filter button (you can move to CSS file) */}
      <style>{`
        .filter-buttons button {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          cursor: pointer;
          border: 1px solid #007bff;
          border-radius: 4px;
          background-color: white;
          color: #007bff;
          transition: background-color 0.3s, color 0.3s;
        }

        .filter-buttons button:hover {
          background-color: #007bff;
          color: white;
        }

        .filter-buttons button.active-filter {
          background-color: #007bff;
          color: white;
        }
      `}</style>
    </div>
  );
}

export default Case;
