import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import './Dashboard.css';
import './Responsive.css';
import './App.css';

function ServiceForm() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Form related state
  const [caseNumber, setCaseNumber] = useState('Not Available');
  const [imageFolder, setImageFolder] = useState([]);
  const [pageDetails, setPageDetails] = useState({ caseId: '', technicianTripId: '' });
  const [timesheets, setTimesheets] = useState([]); // placeholder if you have this elsewhere
  const [taskCompletion, setTaskCompletion] = useState([]);
  const [taskParts, setTaskParts] = useState([]);

  // Signature pads - simplified placeholders
  const signaturePad1 = useRef(null);
  const signaturePad2 = useRef(null);

  const getSignatureDataURL = (ref) => {
    return ref.current ? ref.current.toDataURL("image/png") : null;
  };

  const userName = localStorage.getItem('userName') || 'Guest';
  const userRole = localStorage.getItem('userRole') || 'Visitor';

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  async function fetchDetails(caseNum, userId) {
    try {
      setPageDetails({
        caseId: '123',
        technicianTripId: '456',
      });

      setTaskCompletion([
        { id: 'task1', label: 'Task 1' },
        { id: 'task2', label: 'Task 2' },
      ]);

      setTaskParts([
        { servicePartId: 'part1', name: 'Part 1', qtyUsed: 0, qtyReturned: 0 },
        { servicePartId: 'part2', name: 'Part 2', qtyUsed: 0, qtyReturned: 0 },
      ]);

      setCaseNumber(caseNum);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!caseNumber || caseNumber === 'Not Available') {
      alert('Error: Case number is missing. Please ensure the case number is available.');
      return;
    }

    if (imageFolder.length === 0) {
      alert('Error: Please capture at least one image before submitting.');
      return;
    }

    const technicianSignature = getSignatureDataURL(signaturePad1);
    const supervisorSignature = getSignatureDataURL(signaturePad2);

    if (!technicianSignature || !supervisorSignature) {
      alert('Error: Both Technician and Supervisor signatures must be completed.');
      return;
    }

    try {
      const imagePayload = {
        caseNumber,
        images: imageFolder,
        signatures: {
          technician: technicianSignature,
          supervisor: supervisorSignature,
        },
      };

      const otherPayload = {
        caseId: pageDetails.caseId,
        technicianTripId: pageDetails.technicianTripId,
        taskCompletion: taskCompletion.filter(tc => tc.checked).map(tc => tc.id),
        taskParts: taskParts.filter(tp => tp.checked).map(tp => ({
          servicePartId: tp.servicePartId,
          qtyUsed: tp.qtyUsed,
          qtyReturned: tp.qtyReturned,
        })),
      };

      const response = await fetch(
        'https://7849230-sb1.app.netsuite.com/app/site/hosting/scriptlet.nl?script=5185&deploy=1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePayload, otherPayload, timesheets }),
        }
      );
      const result = await response.json();

      if (!result.success) {
        alert(`Error: ${result.error || ''}`);
        return;
      }

      alert('Record saved successfully.');
      navigate(-1);
    } catch (error) {
      console.error('Error during form submission:', error);
      alert('An unexpected error occurred during submission. Please try again.');
    }
  };

  const handleTaskCompletionChange = (id) => {
    setTaskCompletion(prev =>
      prev.map(tc => (tc.id === id ? { ...tc, checked: !tc.checked } : tc))
    );
  };

  const handleTaskPartsChange = (id, field, value) => {
    setTaskParts(prev =>
      prev.map(tp =>
        tp.servicePartId === id ? { ...tp, [field]: value } : tp
      )
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseNum = params.get('caseNumber');
    const userId = params.get('userId');
    if (caseNum && caseNum !== 'null' && caseNum !== 'undefined') {
      fetchDetails(caseNum, userId);
    }
  }, []);

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

      {/* Main Content */}
      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        <div className="container card-main">
          <h1 className="dashboard-title">Service Form</h1>

          {/* Display Case Number */}
          <p>Case Number: <strong className="case-number-display">{caseNumber}</strong></p>

          <form id="service-form" onSubmit={handleSubmit}>
            {/* Task Completion */}
            <fieldset className="form-group">
              <legend>Task Completion</legend>
              {taskCompletion.length === 0 ? (
                <p className="error-message">Loading task completion options...</p>
              ) : (
                taskCompletion.map(tc => (
                  <label key={tc.id} className="form-group-label">
                    <input
                      type="checkbox"
                      name="task-completion"
                      data-task-id={tc.id}
                      checked={!!tc.checked}
                      onChange={() => handleTaskCompletionChange(tc.id)}
                    />
                    {tc.label}
                  </label>
                ))
              )}
            </fieldset>

            {/* Task Parts */}
            <fieldset className="form-group">
              <legend>Task Parts</legend>
              {taskParts.length === 0 ? (
                <p className="error-message">Loading parts...</p>
              ) : (
                taskParts.map(tp => (
                  <div key={tp.servicePartId} className="task-part-row form-group">
                    <label className="form-group-label">
                      <input
                        type="checkbox"
                        name="task-parts"
                        data-id={tp.servicePartId}
                        checked={!!tp.checked}
                        onChange={() => handleTaskPartsChange(tp.servicePartId, 'checked', !tp.checked)}
                      />
                      {tp.name}
                    </label>
                    <label className="form-group-label">
                      Qty Used:
                      <input
                        type="number"
                        id={`qty-used-servrow-${tp.servicePartId}`}
                        value={tp.qtyUsed}
                        min={0}
                        onChange={(e) => handleTaskPartsChange(tp.servicePartId, 'qtyUsed', e.target.value)}
                        disabled={!tp.checked}
                        className="qty-input"
                      />
                    </label>
                    <label className="form-group-label">
                      Qty Returned:
                      <input
                        type="number"
                        id={`return-unused-servrow-${tp.servicePartId}`}
                        value={tp.qtyReturned}
                        min={0}
                        onChange={(e) => handleTaskPartsChange(tp.servicePartId, 'qtyReturned', e.target.value)}
                        disabled={!tp.checked}
                        className="qty-input"
                      />
                    </label>
                  </div>
                ))
              )}
            </fieldset>

            {/* Image capture placeholder */}
            <fieldset className="form-group">
              <legend>Captured Images</legend>
              <p>{imageFolder.length} image(s) captured.</p>
              {/* Add image capture UI here */}
            </fieldset>

            {/* Signatures placeholder */}
            <fieldset className="form-group">
              <legend>Signatures</legend>
              <p>Technician Signature:</p>
              <canvas
                ref={signaturePad1}
                width="300"
                height="100"
                className="signature-pad"
              />
              <p>Supervisor Signature:</p>
              <canvas
                ref={signaturePad2}
                width="300"
                height="100"
                className="signature-pad"
              />
            </fieldset>

            <button type="submit" className="submit-btn">Submit Service Form</button>
          </form>
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

export default ServiceForm;
