import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import Chart from 'chart.js/auto';
import './Dashboard.css';
import './Responsive.css';
import './App.css';

function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    completedCases: '...',
    totalCases: '...',
    pendingCases: '...',
  });

  const userName = localStorage.getItem('userName') || 'Null';
  const userRole = localStorage.getItem('userRole') || 'Null';
  const userId = localStorage.getItem('userId') || 'N/A';
  const userSubsidiary = localStorage.getItem('userSubsidiary');

  const toggleSidebar = () => setIsSidebarVisible(prev => !prev);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  useEffect(() => {
    let index = 0;
    const slides = document.querySelectorAll('.slide');
    const interval = setInterval(() => {
      slides.forEach((slide) => slide.classList.remove('active'));
      slides[index % slides.length].classList.add('active');
      index++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  async function fetchData() {
    try {
      const response = await fetch(
        `https://7849230.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=5458&deploy=1&compid=7849230&ns-at=AAEJ7tMQ7BwzYpdp-l2HmXmyjOrdjetCaK_DvybWBEXZ0Qi6pU4&employeeId=${userId}`
      );
      const data = await response.json();
      setDashboardData(data);

        const newChart = new Chart(chartRef.current, {
          type: 'bar',
          data: {
            labels: ['Completed', 'Pending', 'Total'],
            datasets: [
              {
                label: 'Cases Overview',
                data: [data.completedCases, data.pendingCases, data.totalCases],
                backgroundColor: [
                  'rgba(75, 192, 192, 0.2)',
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                ],
                borderColor: [
                  'rgba(75, 192, 192, 1)',
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Cases Overview' },
            },
            scales: { y: { beginAtZero: true } },
          },
        });

        setChartInstance(newChart);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    }

    fetchData();
    return () => {
      if (chartInstance) chartInstance.destroy();
    };
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
          <li><a href="#equipment">Equipment</a></li>
          {/* <li><a href="#serviceform">Service Form</a></li> */}
          <li><a href="#usagereading">Usage Reading</a></li>
          {/* <li><a href="#camera">Camera Test</a></li> */}
          <li><button onClick={handleLogout}>Logout</button></li>
        </ul>
      </div>

      {isSidebarVisible && <div className="sidebar-backdrop" onClick={toggleSidebar}></div>}

      {/* Main Dashboard */}
      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        <div className="dashboard">
          <h1 className="dashboard-title">Maintenance Dashboard</h1>

          <div className="dashboard-card">
  <div className="card-title">Cases Completed</div>
  <div className="card-value" style={{ color: '#28a745', fontWeight: 'bold' }}>
    {dashboardData.completedCases}
  </div>
</div>

<div className="dashboard-card">
  <div className="card-title">Total Number of Cases</div>
  <div className="card-value" style={{ color: '#2945e6ff', fontWeight: 'bold' }}>
    {dashboardData.totalCases}
  </div>
</div>

<div className="dashboard-card">
  <div className="card-title">Pending Cases</div>
  <div className="card-value" style={{ color: '#fd1414ff', fontWeight: 'bold' }}>
    {dashboardData.pendingCases}
  </div>
</div>


          {/* <div className="dashboard-card">
            <div className="card-title">Slideshow</div>
            <div className="slideshow">
              <div className="slide active" style={{ backgroundImage: `url('https://via.placeholder.com/300')` }} />
              <div className="slide" style={{ backgroundImage: `url('https://via.placeholder.com/300/333')` }} />
              <div className="slide" style={{ backgroundImage: `url('https://via.placeholder.com/300/666')` }} />
            </div>
          </div> */}

          <div className="chart-container">
            <canvas ref={chartRef} />
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
    </div>
  );
}

export default Dashboard;
