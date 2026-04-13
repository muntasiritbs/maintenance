import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import './Dashboard.css';
import './Responsive.css';
import './Equipment.css';
import './App.css';
import Loader from './Loader';

function Equipment() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceCases, setServiceCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUsageReading, setNewUsageReading] = useState('');
  const [submittingUsage, setSubmittingUsage] = useState(false);

  const userName = localStorage.getItem('userName') || 'Guest';
  const userRole = localStorage.getItem('userRole') || 'Visitor';
  const userSubsidiary = localStorage.getItem('userSubsidiary');

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    if (!userSubsidiary) {
      setEquipmentList([]);
      return;
    }

    setLoading(true);
    const url = `https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U&action=getEquipmentBySubsidiaryName&subsidiary=${encodeURIComponent(userSubsidiary)}`;

    fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEquipmentList(data.equipment || []);
        } else {
          alert(`Error loading equipment: ${data.error || 'Unknown error'}`);
          setEquipmentList([]);
        }
      })
      .catch(err => {
        alert(`Network error: ${err.message}`);
        setEquipmentList([]);
      })
      .finally(() => setLoading(false));
  }, [userSubsidiary]);

  // Add this submit handler inside your Equipment component:
const handleSaveUsage = () => {
  if (!newUsageReading) {
    alert('Please enter a usage reading.');
    return;
  }

  setSubmittingUsage(true); // Start loader

  const payload = {
    action: 'submitUsageReading',
    equipmentId: selectedEquipment.id,
    newMileage: newUsageReading,
    readingTimestamp: new Date().toISOString()
  };

  fetch('https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('Usage reading saved successfully!');
        setNewUsageReading('');
      } else {
        alert('Error saving usage reading: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(err => {
      alert('Network error: ' + err.message);
    })
    .finally(() => {
      setSubmittingUsage(false); // Stop loader
    });
};


  const openModal = equipment => {
  setSelectedEquipment(equipment);
  setServiceCases([]); // Clear previous

  fetch(`https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5457&deploy=1&compid=7849230&ns-at=AAEJ7tMQQOlA8RVXNbv39719DUxVi8Hob6HtiOnc6_Em-Zq1y-U&action=getLast10CasesByEquipmentId&equipmentId=${equipment.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setServiceCases(data.cases || []);
      } else {
        alert('Failed to load service cases.');
      }
    })
    .catch(err => {
      console.error('Error fetching service cases:', err);
      alert('Network error while loading service cases.');
    });
};


  const closeModal = () => {
    setSelectedEquipment(null);
    setServiceCases([]);
  };

  useEffect(() => {
  if (selectedEquipment) {
    // Disable body scroll when modal is open
    document.body.style.overflow = 'hidden';
  } else {
    // Re-enable scroll when modal is closed
    document.body.style.overflow = '';
  }

  // Cleanup on unmount just in case
  return () => {
    document.body.style.overflow = '';
  };
}, [selectedEquipment]);


  const filteredEquipment = equipmentList.filter(eq =>
    (`${eq.name} ${eq.make_model} ${eq.location} ${eq.type}`.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="home-container">
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

      <div className={`sidebar ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <div className="sidebar-header">
          <h3>Menu</h3>
          <button className="close-btn" onClick={toggleSidebar}><FaTimes /></button>
        </div>
        <ul className="sidebar-content">
          <li><a href="#dashboard">Dashboard</a></li>
          <li><a href="#case">Cases</a></li>
          <li><a href="#equipment">Equipments</a></li>
          <li><a href="#usagereading">Usage Reading</a></li>
          <li><button onClick={handleLogout}>Logout</button></li>
        </ul>
      </div>

      {isSidebarVisible && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}

      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        <div className="card-main-equipment">
          <h1 className="dashboard-title">Equipments</h1>

          <div className="equipment-search-input-container">
            <input
              type="text"
              placeholder="Search by Name, Make/Model, Location, or Type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
  <Loader />
) : filteredEquipment.length === 0 ? (
  <p style={{ marginTop: '1rem' }}>No equipment found.</p>
) : (
  <div className="equipment-card-wrapper">
{filteredEquipment.map((eq, idx) => (
  <div key={idx} className="equipment-card" onClick={() => openModal(eq)}>
    {eq.image_url && (
      <img src={eq.image_url} alt={eq.name} className="equipment-image" />
    )}
    <h3 className="equipment-name">{eq.name || 'N/A'}</h3>
    <p><strong>Make/Model:</strong> {eq.make_model || 'N/A'}</p>
    <p><strong>Location:</strong> {eq.location || 'N/A'}</p>
    <p><strong>Serial Number:</strong> {eq.serial_number || 'N/A'}</p>
    <p><strong>Type:</strong> {eq.type || 'N/A'}</p>

    {/* Debug: Show reading in the card itself */}
    <p><strong>Reading:</strong> {eq.reading_entered || 'N/A'}</p>
  </div>
))}
  </div>
)}

        </div>
      </div>

      {selectedEquipment && (
        <div className="equipment-detail-modal" style={{ display: 'flex' }}>
          <div className="equipment-modal-content">
            <div className="modal-header">
              <h1>{selectedEquipment.name}</h1>
              <span className="close" onClick={closeModal}>&times;</span>
            </div>
            <div className="box">
              <h2>Equipment Information</h2>
              <div className="equipment-info">
                <div><strong>Class:</strong> {selectedEquipment.name}</div>
                <div><strong>Department:</strong> {selectedEquipment.location}</div>
                <div><strong>Type:</strong> {selectedEquipment.type}</div>
                <div><strong>Subsidiary:</strong> {selectedEquipment.subsidiary_name}</div>
                <div><strong>Make/Model:</strong> {selectedEquipment.make_model}</div>
                <div><strong>Operational?</strong> {selectedEquipment.operational}</div>
                <div><strong>Created:</strong> {selectedEquipment.created}</div>
              </div>
            </div>
<div className="box">
  <h2>Last 10 Service Cases</h2>
  {serviceCases.length > 0 ? (
    <div className="table-container">
      <table className="case-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Date Created</th>
            <th>Usage</th>
            <th>Date of Last Service</th>
          </tr>
        </thead>
        <tbody>
          {serviceCases.map((c, i) => (
            <tr key={i}>
              <td>{c.subject || '-'}</td>
              <td>{c.created || '-'}</td>
              <td>{c.usage || '-'}</td>
              <td>{c.dateOfLastService || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p>No service cases found for this equipment.</p>
  )}
</div>

            <div className="box">
              <h2>User Manual</h2>
              <p>{selectedEquipment.manual_details || '[User manual details here]'}</p>
              {selectedEquipment.manual_url && (
                <p><a href={selectedEquipment.manual_url} target="_blank" rel="noopener noreferrer">Download User Manual</a></p>
              )}
            </div>
            <div className="usage-container box">
  <h2>Usage Reading</h2>
  <div><strong>Current Reading:</strong> {selectedEquipment.reading_entered || 'N/A'}</div>
  <label htmlFor="usageInput">Enter New Usage Reading:</label>
  <input
    id="usageInput"
    type="text"
    placeholder="Enter usage"
    value={newUsageReading}
    onChange={(e) => setNewUsageReading(e.target.value)}
  />

  {submittingUsage ? (
    <div style={{ marginTop: '1rem' }}>
      <Loader />
    </div>
  ) : (
    <button onClick={handleSaveUsage}>Save Usage</button>
  )}
</div>

          </div>
        </div>
      )}

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

export default Equipment;
