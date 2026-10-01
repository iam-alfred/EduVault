const loginPanel = document.getElementById('loginPanel');
const dashboard = document.getElementById('dashboard');

const loginMessage = document.getElementById('loginMessage');
const uploadMessage = document.getElementById('uploadMessage');
const adminMaterials = document.getElementById('adminMaterials');

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// --------------------------------------------------
// CHECK ADMIN LOGIN
// --------------------------------------------------

async function check() {
  try {
    const response = await fetch('/api/admin/me');
    const data = await response.json();

    if (data.isAdmin) {
      loginPanel.classList.add('hidden');
      dashboard.classList.remove('hidden');
      loadAdmin();
    } else {
      loginPanel.classList.remove('hidden');
      dashboard.classList.add('hidden');
    }

  } catch (error) {
    console.error('Admin status check failed:', error);
    loginMessage.textContent = 'Unable to check admin login status.';
  }
}

// --------------------------------------------------
// LOAD MATERIALS
// --------------------------------------------------

async function loadAdmin() {
  try {
    const response = await fetch('/api/materials');
    const items = await response.json();

    adminMaterials.innerHTML = items.length
      ? items.map((material) => `
          <div class="admin-row">

            <div>
              <strong>${esc(material.title)}</strong>

              <small>
                ${esc(material.category)}
                •
                ${esc(material.course)}
                •
                ${Number(material.downloads || 0)} downloads
              </small>
            </div>

            <button
              class="danger-btn"
              data-id="${material.id}">
              Delete
            </button>

          </div>
        `).join('')

      : '<p class="message">No materials uploaded yet.</p>';

    document
      .querySelectorAll('.danger-btn')
      .forEach((button) => {

        button.onclick = async () => {

          if (!confirm('Delete this material?')) {
            return;
          }

          const response = await fetch(
            '/api/admin/materials/' + button.dataset.id,
            {
              method: 'DELETE'
            }
          );

          const data = await response.json();

          if (!response.ok) {
            alert(data.error || 'Unable to delete material.');
            return;
          }

          loadAdmin();
        };
      });

  } catch (error) {
    console.error('Unable to load materials:', error);
    adminMaterials.innerHTML =
      '<p class="message">Unable to load materials.</p>';
  }
}

// --------------------------------------------------
// ADMIN LOGIN
// --------------------------------------------------

document.getElementById('loginForm').onsubmit = async (event) => {

  event.preventDefault();

  loginMessage.textContent = 'Signing in...';

  try {

    const response = await fetch('/api/admin/login', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify(
        Object.fromEntries(
          new FormData(event.target)
        )
      )
    });

    const data = await response.json();

    if (!response.ok) {
      loginMessage.textContent =
        data.error || 'Invalid username or password.';
      return;
    }

    loginMessage.textContent = '';

    event.target.reset();

    await check();

  } catch (error) {

    console.error('Admin login error:', error);

    loginMessage.textContent =
      'Unable to connect to the server.';
  }
};

// --------------------------------------------------
// ADMIN LOGOUT
// --------------------------------------------------

document.getElementById('logoutBtn').onclick = async () => {

  try {
    await fetch('/api/admin/logout', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  location.reload();
};

// --------------------------------------------------
// UPLOAD MATERIAL
// --------------------------------------------------

document.getElementById('uploadForm').onsubmit = async (event) => {

  event.preventDefault();

  uploadMessage.textContent = 'Uploading...';

  try {

    const response = await fetch(
      '/api/admin/materials',
      {
        method: 'POST',
        body: new FormData(event.target)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      uploadMessage.textContent =
        data.error || 'Unable to upload material.';
      return;
    }

    event.target.reset();

    uploadMessage.textContent =
      'Uploaded successfully.';

    loadAdmin();

  } catch (error) {

    console.error('Upload error:', error);

    uploadMessage.textContent =
      'Unable to connect to the server.';
  }
};

// --------------------------------------------------
// START
// --------------------------------------------------

check();