import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import { ShieldCheck } from 'lucide-react';
import './Dashboard.css';
import './Responsive.css';
import './App.css';
import './CaseCards.css';
import './AdminCase.css';
import Loader from './Loader';

const SUITELET_URL =
  'https://td3013433.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1540&deploy=1&compid=TD3013433&ns-at=AAEJ7tMQkKcbBbXxk_5prafJV5M2mxtXQHbKbzZP68uPBBDy1Zc';

function AdminCase() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [cases, setCases] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTech, setSelectedTech] = useState({});
  const [assigning, setAssigning] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState({});
  const [selectedCase, setSelectedCase] = useState(null);

  const userName = localStorage.getItem('userName') || 'Guest';
  const userRole = localStorage.getItem('userRole') || '';
  const userEmail = localStorage.getItem('userEmail') || '';
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Role guard — redirect non-admins
  useEffect(() => {
    if (userRole.toLowerCase() !== 'administrator' && userRole.toLowerCase() !== 'admin') {
      navigate('/dashboard');
    }
  }, [userRole, navigate]);

  // Fetch all cases
  useEffect(() => {
    setLoading(true);
    fetch(`${SUITELET_URL}&action=getCasesAll`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        const sorted = (Array.isArray(data) ? data : data.cases || []).sort((a, b) => {
          return parseInt(b.caseNumber, 10) - parseInt(a.caseNumber, 10);
        });
        setCases(sorted);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch technicians list
  useEffect(() => {
    fetch(`${SUITELET_URL}&action=getTechnicians`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        setTechnicians(Array.isArray(data) ? data : data.technicians || []);
      })
      .catch(err => console.error('Failed to load technicians:', err.message));
  }, []);

  const handleAssign = async (caseId) => {
  const techId = selectedTech[caseId];

  if (!techId) {
    alert('Please select a technician before assigning.');
    return;
  }

  setAssigning(caseId);

  try {
    const response = await fetch(SUITELET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assignTechnician',
        caseId,              // ✅ CHANGE HERE
        technicianId: techId,
      }),
    });

    const data = await response.json();

    if (data.success) {
      const techName =
        technicians.find(t => String(t.id) === String(techId))?.name || techId;

      setCases(prev =>
        prev.map(c =>
          c.caseId === caseId ? { ...c, assignedTo: techName } : c
        )
      );

      setAssignSuccess(prev => ({ ...prev, [caseId]: true }));
      setTimeout(() =>
        setAssignSuccess(prev => ({ ...prev, [caseId]: false })), 3000
      );
    } else {
      alert(`Failed to assign: ${data.error}`);
    }
  } finally {
    setAssigning(null);
  }
};

  // Filter by type + assignment status + search
  const filteredCases = cases
    .filter(c => !filterType || c.caseType?.toLowerCase() === filterType)
    .filter(c => !showUnassigned || !c.assignedTo)
    .filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.caseNumber?.toString().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.equipment?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.assignedTo?.toLowerCase().includes(q)
      );
    });

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
          <li><a href="#admin">Admin Work Orders</a></li>
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
          <h1 className="dashboard-title">Admin — Work Orders Management</h1>

          <div className="admin-page-badge">
            <ShieldCheck size={13} />
            Admin View
          </div>

          {/* Search */}
          <input
            type="text"
            className="admin-search-bar"
            placeholder="Search by Work Orders #, subject, equipment, location, or assignee..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

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
            <button
              className={`filter-btn ${showUnassigned ? 'active-filter' : ''}`}
              onClick={() => setShowUnassigned(prev => !prev)}
            >
              Unassigned
            </button>
          </div>

          {loading && <Loader />}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
          {!loading && !error && filteredCases.length === 0 && (
            <p>No cases found.</p>
          )}

          <div className="admin-case-container">
            {filteredCases.map((caseItem, index) => {
              const priorityClass =
                caseItem.priority?.toLowerCase() === 'high'
                  ? 'priority-high'
                  : caseItem.priority?.toLowerCase() === 'medium'
                  ? 'priority-medium'
                  : 'priority-low';

              const isAssigning = assigning === caseItem.caseNumber;
              const justAssigned = assignSuccess[caseItem.caseNumber];

              return (
                <div key={index} className="admin-case-card">
                  {/* Case info — clickable */}
                  <div className="admin-card-top" onClick={() => setSelectedCase(caseItem)} style={{ cursor: 'pointer' }}>
                    <img
                      src={caseItem.image || 'https://via.placeholder.com/64'}
                      alt="Equipment"
                      className="admin-case-image"
                    />
                    <div className="admin-case-info">
                      <div className={`admin-priority-tag ${priorityClass}`}>
                        {caseItem.priority || 'N/A'}
                      </div>
                      <h3>Work Orders #{caseItem.caseNumber || 'N/A'}</h3>
                      <span><b>Subject:</b> {caseItem.subject || 'N/A'}</span>
                      <span><b>Equipment:</b> {caseItem.equipment || 'N/A'}</span>
                      <span><b>Status:</b> {caseItem.status || 'N/A'}</span>
                      <span><b>Scheduled:</b> {caseItem.schedule || 'N/A'}</span>
                      <span><b>Location:</b> {caseItem.location || 'N/A'}</span>
                      <span><b>Type:</b> {caseItem.caseType || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Assign panel — stop click bubbling to card */}
                  <div className="assign-panel" onClick={e => e.stopPropagation()}>
                    <div className="assign-panel-label">Technician Assignment</div>

                    <span
                      className={`assigned-badge ${caseItem.assignedTo ? 'is-assigned' : 'not-assigned'}`}
                    >
                      {caseItem.assignedTo
                        ? `Assigned: ${caseItem.assignedTo}`
                        : 'Unassigned'}
                    </span>

                    {justAssigned && (
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                        ✓ Assigned successfully
                      </span>
                    )}

                    <div className="assign-row">
                      <select
                        className="tech-select"
                        value={selectedTech[caseItem.caseId] || ''}
                        onChange={e =>
                          setSelectedTech(prev => ({
                            ...prev,
                            [caseItem.caseId]: e.target.value,
                          }))
                        }
                      >
                        <option value="">— Select technician —</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>

                      <button
                        className="assign-btn"
                        onClick={() => handleAssign(caseItem.caseId)}
                        disabled={isAssigning || !selectedTech[caseItem.caseId]}
                      >
                        {isAssigning ? 'Assigning…' : 'Assign'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="admin-modal-overlay" onClick={() => setSelectedCase(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="admin-modal-header">
              <div>
                <div className="admin-modal-subtitle">Work Order Details</div>
                <h2 className="admin-modal-title">Work Order #{selectedCase.caseId}</h2>
              </div>
              <button className="admin-modal-close" onClick={() => setSelectedCase(null)}>
                <FaTimes />
              </button>
            </div>

            {/* Modal body */}
            <div className="admin-modal-body">
              {selectedCase.image && (
                <div className="admin-modal-image-wrap">
                  <img
                    src={selectedCase.image}
                    alt="Equipment"
                    className="admin-modal-image"
                  />
                </div>
              )}

              <div className="admin-modal-section-label">Case Information</div>
              <div className="admin-modal-grid">
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Subject</span>
                  <span className="admin-modal-field-value">{selectedCase.subject || 'N/A'}</span>
                </div>
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Status</span>
                  <span className="admin-modal-field-value">{selectedCase.status || 'N/A'}</span>
                </div>
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Priority</span>
                  <span className={`admin-priority-tag ${
                    selectedCase.priority?.toLowerCase() === 'high' ? 'priority-high'
                    : selectedCase.priority?.toLowerCase() === 'medium' ? 'priority-medium'
                    : 'priority-low'}`}>
                    {selectedCase.priority || 'N/A'}
                  </span>
                </div>
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Case Type</span>
                  <span className="admin-modal-field-value">{selectedCase.caseType || 'N/A'}</span>
                </div>
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Scheduled For</span>
                  <span className="admin-modal-field-value">{selectedCase.schedule || 'N/A'}</span>
                </div>
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Location</span>
                  <span className="admin-modal-field-value">{selectedCase.location || 'N/A'}</span>
                </div>
              </div>

              <div className="admin-modal-section-label">Equipment Information</div>
              <div className="admin-modal-grid">
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Equipment</span>
                  <span className="admin-modal-field-value">{selectedCase.equipment || 'N/A'}</span>
                </div>
                <div className="admin-modal-field">
                  <span className="admin-modal-field-label">Make &amp; Model</span>
                  <span className="admin-modal-field-value">{selectedCase.makeModel || 'N/A'}</span>
                </div>
                <div className="admin-modal-field admin-modal-field--full">
                  <span className="admin-modal-field-label">Subsidiary</span>
                  <span className="admin-modal-field-value">{selectedCase.equipmentSubsidiary || 'N/A'}</span>
                </div>
              </div>

              <div className="admin-modal-section-label">Assignment</div>
              <div className="admin-modal-grid">
                <div className="admin-modal-field admin-modal-field--full">
                  <span className="admin-modal-field-label">Assigned Technician</span>
                  <span className={`assigned-badge ${selectedCase.assignedTo ? 'is-assigned' : 'not-assigned'}`}>
                    {selectedCase.assignedTo || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default AdminCase;
