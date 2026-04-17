import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import { CheckCircle2, Layers, Clock } from 'lucide-react';
import Chart from 'chart.js/auto';
import './Dashboard.css';
import './Responsive.css';
import './App.css';

function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);
  const pieChartRef = useRef(null);
  const [pieChartInstance, setPieChartInstance] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    completedCases: '...',
    totalCases: '...',
    pendingCases: '...',
  });

  const userName = localStorage.getItem('userName') || 'Null';
  const userRole = localStorage.getItem('userRole') || 'Null';
  const userId = localStorage.getItem('userId') || 'N/A';
  const userSubsidiary = localStorage.getItem('userSubsidiary');
  const userEmail = localStorage.getItem('userEmail') || '';
  const userInitials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
        `https://td3013433.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1549&deploy=1&compid=TD3013433&ns-at=AAEJ7tMQc4Rz-cqbK0ErNW_fTAeZDAeYmXw9lvd4i1hNw-UeWuk&employeeId=${userId}`
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
                  'rgba(34, 197, 94, 0.75)',
                  'rgba(249, 115, 22, 0.75)',
                  'rgba(37, 99, 235, 0.75)',
                ],
                borderColor: [
                  'rgba(22, 163, 74, 1)',
                  'rgba(234, 88, 12, 1)',
                  'rgba(29, 78, 216, 1)',
                ],
                borderWidth: 2,
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              title: { display: true, text: 'Cases Overview', font: { size: 13, weight: 'bold' }, color: '#374151', padding: { bottom: 12 } },
            },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } },
            },
          },
        });
        setChartInstance(newChart);

        // Pie / doughnut chart
        const completed = Number(data.completedCases) || 0;
        const pending   = Number(data.pendingCases)   || 0;
        const total     = Number(data.totalCases)     || 0;
        const other     = Math.max(0, total - completed - pending);

        const pieLabels = other > 0 ? ['Completed', 'Pending', 'Other'] : ['Completed', 'Pending'];
        const pieData   = other > 0 ? [completed, pending, other]       : [completed, pending];
        const pieColors = other > 0 ? ['#22c55e', '#f97316', '#94a3b8'] : ['#22c55e', '#f97316'];
        const pieBorder = other > 0 ? ['#16a34a', '#ea580c', '#64748b'] : ['#16a34a', '#ea580c'];

        const newPieChart = new Chart(pieChartRef.current, {
          type: 'doughnut',
          data: {
            labels: pieLabels,
            datasets: [{
              data: pieData,
              backgroundColor: pieColors,
              borderColor: pieBorder,
              borderWidth: 2,
              hoverOffset: 8,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { padding: 14, font: { size: 12 }, boxWidth: 12 } },
              title: { display: true, text: 'Cases Distribution', font: { size: 13, weight: 'bold' }, color: '#374151', padding: { bottom: 10 } },
            },
            cutout: '62%',
          },
        });
        setPieChartInstance(newPieChart);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    }

    fetchData();
    return () => {
      if (chartInstance)    chartInstance.destroy();
      if (pieChartInstance) pieChartInstance.destroy();
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
              src="https://7849230.app.netsuite.com/core/media/media.nl?id=5349153&c=7849230&h=Wnp2-mOwvlhQYw9AxlcHwS3d2i2EmBAghRqJ037KL1cdycun"
              alt="Company Logo"
              className="company-logo"
            />
            <div className="portal-title">
              <img
                src="https://td3013433.app.netsuite.com/core/media/media.nl?id=8189&c=TD3013433&h=dJaok088VJE8_iB3MvKf8PdJCZ1AGrhPFGB6J-J8c0L3iWRW"
                alt="Maintenance Logo"
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
          {/* <li><a href="#serviceform">Service Form</a></li> */}
          <li><a href="#usagereading">Usage Reading</a></li>
          {/* <li><a href="#camera">Camera Test</a></li> */}
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

      {/* Main Dashboard */}
      <div id="main-content" className={isSidebarVisible ? 'shifted' : ''}>
        <div className="dashboard">
          <h1 className="dashboard-title">Dashboard</h1>

          <div className="dashboard-card card-success">
            <div className="card-header-row">
              <div className="card-title">Cases Completed</div>
              <div className="card-icon card-icon-green">
                <CheckCircle2 size={18} color="#16a34a" />
              </div>
            </div>
            <div className="card-value" style={{ color: '#16a34a' }}>
              {dashboardData.completedCases}
            </div>
          </div>

          <div className="dashboard-card card-info">
            <div className="card-header-row">
              <div className="card-title">Total Cases</div>
              <div className="card-icon card-icon-blue">
                <Layers size={18} color="#2563eb" />
              </div>
            </div>
            <div className="card-value" style={{ color: '#2563eb' }}>
              {dashboardData.totalCases}
            </div>
          </div>

          <div className="dashboard-card card-danger">
            <div className="card-header-row">
              <div className="card-title">Pending Cases</div>
              <div className="card-icon card-icon-red">
                <Clock size={18} color="#dc2626" />
              </div>
            </div>
            <div className="card-value" style={{ color: '#dc2626' }}>
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

          <div className="pie-chart-container">
            <canvas ref={pieChartRef} />
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

export default Dashboard;
