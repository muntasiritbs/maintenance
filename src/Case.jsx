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
  const userEmail = localStorage.getItem('userEmail') || '';
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const fetchCases = async () => {
    try {
      const response = await fetch(
        `https://td3013433.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1540&deploy=1&compid=TD3013433&ns-at=AAEJ7tMQkKcbBbXxk_5prafJV5M2mxtXQHbKbzZP68uPBBDy1Zc&action=getCases&currentUser=${encodeURIComponent(userName)}`,
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
              src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349153&c=7849230&h=Wnp2-mOwvlhQYw9AxlcHwS3d2i2EmBAghRqJ037KL1cdycun"
              alt="Company Logo"
              className="company-logo"
            />
            <div className="portal-title">
              <img
                src="https://td3013433.app.netsuite.com/core/media/media.nl?id=8189&c=TD3013433&h=dJaok088VJE8_iB3MvKf8PdJCZ1AGrhPFGB6J-J8c0L3iWRW"
                alt="Profix Logo"
                className="portal-logo"
              />
            </div>
            <div className="user-info">
              Signed in: {userName} ({userRole})<br />
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
          <li><a href="#case">Work Orders</a></li>
          <li><a href="#equipment">Equipments</a></li>
          <li><a href="#usagereading">Usage Reading</a></li>
          {(userRole.toLowerCase() === 'administrator' || userRole.toLowerCase() === 'admin') && (
            <li><a href="#admin">Admin Work Orders</a></li>
          )}
        </ul>
        <div className="sidebar-user-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">{userInitials}</div>
            <div className="sidebar-user-text">
              <span className="sidebar-user-name">{userName}</span>
              <span className="sidebar-user-email">{userEmail}</span>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {isSidebarVisible && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}

      {/* Main Content */}
      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        <div className="card-main-equipment">
          <h1 className="dashboard-title">Work Orders Management</h1>

          {/* Filter Buttons */}
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterType === null ? 'active-filter' : ''}`}
              onClick={() => setFilterType(null)}
            >
              All
            </button>
            <button
              className={`filter-btn ${filterType === 'reactive' ? 'active-filter' : ''}`}
              onClick={() => setFilterType(prev => prev === 'reactive' ? null : 'reactive')}
            >
              Reactive
            </button>
            <button
              className={`filter-btn ${filterType === 'preventive' ? 'active-filter' : ''}`}
              onClick={() => setFilterType(prev => prev === 'preventive' ? null : 'preventive')}
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
    <h3>Work Orders #{caseItem.caseNumber || 'N/A'}</h3>
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
            src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349151&c=7849230&h=lOs1Nqhu2aEuvCVFxDsUy-U3YE3fMoRcSn3aSJi_A6qyFJ-m"
            alt="Oracle NetSuite Logo"
            className="netsuite-logo"
          />
        </div>
        <p>Copyright © ITelligence Business Solutions</p>
      </div>

    </div>
  );
}

export default Case;
