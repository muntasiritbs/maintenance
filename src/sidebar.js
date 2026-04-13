// Function to load the sidebar
function loadSidebar() {
    fetch("https://7849230-sb1.app.netsuite.com/core/media/media.nl?id=1111417&c=7849230_SB1&h=32LsclzP4McAdaRacGf08b6Rt3seWgsge0fVJEl2dxfIcsNT&_xt=.html")
      .then(response => response.text())
      .then(data => {
        document.getElementById("sidebar-container").innerHTML = data;
        attachSidebarToggle(); // Reattach sidebar toggle functionality
      })
      .catch(error => console.error("Error loading sidebar:", error));
  }

  // Function to reattach sidebar toggle
  function attachSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        if (sidebar.style.width === '0px' || sidebar.style.width === '') {
          sidebar.style.width = '250px';
          document.getElementById('main-content').style.marginLeft = '250px';
        } else {
          sidebar.style.width = '0';
          document.getElementById('main-content').style.marginLeft = '0';
        }
      });
    }
  }

  // Load the sidebar when the page loads
  document.addEventListener("DOMContentLoaded", loadSidebar);