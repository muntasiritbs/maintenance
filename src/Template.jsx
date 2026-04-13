import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import './Dashboard.css';
import './Responsive.css';
import './App.css';

function Case() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const userName = localStorage.getItem('userName') || 'Guest';
  const userRole = localStorage.getItem('userRole') || 'Visitor';

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

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
          <li><a href="#case">Case</a></li>
          <li><button onClick={handleLogout}>Logout</button></li>
        </ul>
      </div>

      {isSidebarVisible && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}

      {/* Main Content Placeholder */}
      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        {/* Your Case content will go here */}
        <div className="dashboard">
          <h1 className="dashboard-title">Case Management</h1>
          {/* Add your case-specific cards or content here */}
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
    </div>
  );
}

export default Case;
