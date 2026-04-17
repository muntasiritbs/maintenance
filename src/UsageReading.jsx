import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import './Dashboard.css';
import './Responsive.css';
import './App.css';

function UsageReading() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [equipmentData, setEquipmentData] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [currentMileage, setCurrentMileage] = useState(0);
  const [newMileage, setNewMileage] = useState('');
  const [timestamp, setTimestamp] = useState('');

  const userName = localStorage.getItem('userName') || 'Guest';
  const userRole = localStorage.getItem('userRole') || 'Visitor';
  const userSubsidiary = localStorage.getItem('userSubsidiary');
  const userEmail = localStorage.getItem('userEmail') || '';
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const SUITELET_URL = 'https://td3013433.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1540&deploy=1&compid=TD3013433&ns-at=AAEJ7tMQkKcbBbXxk_5prafJV5M2mxtXQHbKbzZP68uPBBDy1Zc';

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Fetch equipment list on component mount
useEffect(() => {
  fetch(`${SUITELET_URL}&action=getEquipmentList&subsidiary=${userSubsidiary}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setEquipmentData(data.equipment || []);
      } else {
        throw new Error(data.error || 'Failed to fetch equipment');
      }
    })
    .catch(err => alert(`Error loading equipment data: ${err.message}`));
}, [userSubsidiary]);


  const handleFilter = (e) => {
    const value = e.target.value.toLowerCase();
    const dropdown = document.getElementById('dropdownList');
    dropdown.style.display = value ? 'block' : 'none';

    Array.from(dropdown.children).forEach(child => {
      child.style.display = child.textContent.toLowerCase().includes(value) ? 'block' : 'none';
    });
  };

  const handleSelect = (equipment) => {
    setSelectedEquipment(equipment);
    setCurrentMileage(equipment.reading || 0);
    document.getElementById('equipmentSearch').value = equipment.equipmentName;
    document.getElementById('dropdownList').style.display = 'none';
  };

  const recordTimestamp = () => {
    const entered = parseInt(newMileage.trim());
    if (!entered || entered <= currentMileage) {
      alert('Please enter a valid mileage greater than the current mileage.');
      return;
    }

    if (!selectedEquipment) {
      alert('Please select an equipment.');
      return;
    }

    const timestampISO = new Date().toISOString();
    setTimestamp(new Date().toLocaleString());

    fetch(SUITELET_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'submitUsageReading',
    equipmentId: selectedEquipment.id,
    newMileage: entered
  }),
})

      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Mileage updated successfully in NetSuite!');
          setCurrentMileage(entered);
          // Optionally reset newMileage input after success
          setNewMileage('');
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      })
      .catch(err => alert(`Error: ${err.message}`));
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
          <h1 className="dashboard-title">Usage Reading</h1>

          <div className="mileage-container">
            <h2>Hour/Meter Tracker</h2>

            <div className="form-group searchable-dropdown">
              <label htmlFor="equipmentSearch">Select Equipment:</label>
              <input
                type="text"
                id="equipmentSearch"
                placeholder="Type to search equipment..."
                onInput={handleFilter}
                autoComplete="off"
              />
              <div id="dropdownList" className="dropdown-list" style={{ display: 'none' }}>
                {equipmentData.map(item => (
                  <div
                    key={item.id}
                    className="dropdown-item"
                    onClick={() => handleSelect(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    {item.equipmentName}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Current Reading: {currentMileage}</label>
            </div>

            <div className="form-group">
              <label htmlFor="newMileage">Enter New Reading:</label>
              <input
                type="number"
                id="newMileage"
                placeholder=" "
                value={newMileage}
                onChange={e => setNewMileage(e.target.value)}
                min={currentMileage + 1}
              />
            </div>

            <div className="form-group">
              <button className="btn" onClick={recordTimestamp}>Update Reading</button>
              <div className="timestamp-display">{timestamp ? `Timestamp: ${timestamp}` : 'Timestamp will appear here'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-logo">
          <img
            src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349151&c=7849230&h=lOs1Nqhu2aEuvCVFxDsUy-U3YE3fMoRcSn3aSJi_A6qyFJ-m"
            className="netsuite-logo"
          />
        </div>
        <p>Copyright © ITelligence Business Solutions</p>
      </div>
    </div>
  );
}

export default UsageReading;
