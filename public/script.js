const categories = [
  ['🎓','Undergraduate'],['🎓','Postgraduate'],['🎓','Doctoral'],['📝','Past Questions'],['📚','Novels'],['🎭','Drama'],['✍️','Poetry']
];
const categoriesGrid = document.getElementById('categoriesGrid');
const materialsGrid = document.getElementById('materialsGrid');
const searchResultsGrid = document.getElementById('searchResultsGrid');
const searchMessage = document.getElementById('searchMessage');
const searchInput = document.getElementById('searchInput');
const materialMessage = document.getElementById('materialMessage');
const searchResults = document.querySelector('#searchResults');

categories.forEach(([icon, name]) => {
  const b = document.createElement('button'); b.className = 'category-card'; b.innerHTML = `<span>${icon}</span><strong>${name}</strong>`;
  b.onclick = () => { searchInput.value = name; loadMaterials(name); document.getElementById('materials').scrollIntoView({behavior:'smooth'}); };
  categoriesGrid.appendChild(b);
});
function esc(v=''){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function render(items){
  materialsGrid.innerHTML = '';
searchResultsGrid.innerHTML = '';
searchResults.style.display = 'none';
  if(!items.length){
    materialMessage.textContent = '';
    searchMessage.textContent = 'No matching materials found yet.';
    return;
  }

  
  searchMessage.textContent = '';

  items.forEach(m=>{
    const card=document.createElement('article');
    card.className='material-card';

    card.innerHTML=`<div class="file-icon">PDF</div>
      <div>
        <span class="tag">${esc(m.category)}</span>
        <h3>${esc(m.title)}</h3>
        <p>${esc(m.course)}${m.author?' • '+esc(m.author):''}</p>
      </div>
      <a class="download-btn" href="/download/${encodeURIComponent(m.id)}">
        Download PDF <span>${Number(m.downloads||0)} downloads</span>
      </a>`;

    materialsGrid.appendChild(card);
  });
}
async function loadMaterials(q=''){
  materialMessage.textContent='';
  const term = q.trim();
  const res = await fetch('/api/materials?q='+encodeURIComponent(term));
  const items = await res.json();

  if(term){
    searchResults.style.display = '';
    materialsGrid.innerHTML = '';
    materialMessage.textContent = '';
    searchResultsGrid.innerHTML = '';

    if(!items.length){
      searchMessage.textContent = 'No matching materials found yet.';
      return;
    }

    searchMessage.textContent = '';

    items.forEach(m=>{
      const card=document.createElement('article');
      card.className='material-card';

      card.innerHTML=`<div class="file-icon">PDF</div>
        <div>
          <span class="tag">${esc(m.category)}</span>
          <h3>${esc(m.title)}</h3>
          <p>${esc(m.course)}${m.author?' • '+esc(m.author):''}</p>
        </div>
        <a class="download-btn" href="/download/${encodeURIComponent(m.id)}">
          Download PDF <span>${Number(m.downloads||0)} downloads</span>
        </a>`;

      searchResultsGrid.appendChild(card);
    });

  }else{
    searchResults.style.display = 'none';
    searchResultsGrid.innerHTML = '';
    searchMessage.textContent = '';
    render(items);
  }
}document.getElementById('searchBtn').onclick=()=>{ const q=searchInput.value.trim(); loadMaterials(q); };
searchInput.addEventListener('input', e=>{ if (!e.target.value.trim()) loadMaterials(''); });
searchInput.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('searchBtn').click();});
document.getElementById('aiBtn').onclick=async()=>{
  const question=document.getElementById('aiQuestion').value.trim();

  if(!question){
    document.getElementById('aiMessage').textContent='Please enter a question first.';
    return;
  }

  document.getElementById('aiMessage').textContent='EduVault AI is thinking...';

  const r=await fetch('/api/ai/ask',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({question})
  });

  const d=await r.json();

  document.getElementById('aiMessage').innerHTML =
    d.answer ? marked.parse(d.answer) : (d.error || 'AI is unavailable.');
};
loadMaterials();


// ====================
// STUDENT ACCOUNT
// ====================

document.getElementById('showRegisterBtn').onclick = () => {
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginForm').style.display = 'none';
};

document.getElementById('showLoginBtn').onclick = () => {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
};

document.getElementById('registerBtn').onclick = async () => {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  const message = document.getElementById('registerMessage');

  if (!username || !email || !password) {
    message.textContent = 'Please fill in all fields.';
    return;
  }

  message.textContent = 'Creating your account...';

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      message.textContent = 'Account created successfully. You can now log in.';
      document.getElementById('registerPassword').value = '';
    } else {
      message.textContent = data.error || 'Unable to create account.';
    }

  } catch (error) {
    console.error('Registration error:', error);
    message.textContent = 'Something went wrong. Please try again.';
  }
};

document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const message = document.getElementById('loginMessage');

  if (!email || !password) {
    message.textContent = 'Please enter your email and password.';
    return;
  }

  message.textContent = 'Logging in...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();
if (response.ok) {
  message.textContent = `Welcome back, ${data.user.username}!`;

  document.getElementById('showRegisterBtn').style.display = 'none';
  document.getElementById('showLoginBtn').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';

  const accountCard = document.querySelector('.account-card');

  let accountWelcome = document.getElementById('accountWelcome');

  if (!accountWelcome) {
    accountWelcome = document.createElement('div');
    accountWelcome.id = 'accountWelcome';
    accountWelcome.className = 'account-welcome';

    accountWelcome.innerHTML = `
      <h3>👋 Welcome back, ${esc(data.user.username)}!</h3>
      <p>You are successfully logged in to EduVault.</p>
    `;

    accountCard.appendChild(accountWelcome);
  }

  const existingLogout = document.getElementById('logoutBtn');

  if (!existingLogout) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.className = 'logout-btn';

    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';

      try {
        const logoutResponse = await fetch('/api/auth/logout', {
          method: 'POST'
        });

        const logoutData = await logoutResponse.json();

        if (!logoutResponse.ok) {
          throw new Error(logoutData.error || 'Logout failed.');
        }

        alert('You have been logged out.');
        window.location.reload();

      } catch (error) {
        console.error('Logout error:', error);
        alert('Unable to log out. Please try again.');
        logoutBtn.disabled = false;
        logoutBtn.textContent = 'Logout';
      }
    });

    accountCard.appendChild(logoutBtn);
  }
    } else {
  message.textContent = data.error || 'Unable to log in.';
}
  } catch (error) {
    console.error('Login error:', error);
    message.textContent = 'Something went wrong. Please try again.';
  }
};
// ====================
// CHECK LOGIN STATUS
// ====================

async function checkLoginStatus() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();

    const existingLogout = document.getElementById('logoutBtn');
    if (existingLogout) {
      existingLogout.remove();
    }

    if (data.loggedIn) {
      console.log(`Logged in as ${data.user.username}`);
document.getElementById('showRegisterBtn').style.display = 'none';
document.getElementById('showLoginBtn').style.display = 'none';
document.getElementById('loginForm').style.display = 'none';

const accountCard = document.querySelector('.account-card');

let accountWelcome = document.getElementById('accountWelcome');

if (!accountWelcome) {
  accountWelcome = document.createElement('div');
  accountWelcome.id = 'accountWelcome';
  accountWelcome.className = 'account-welcome';

  accountWelcome.innerHTML = `
    <h3>👋 Welcome back, ${esc(data.user.username)}!</h3>
    <p>You are successfully logged in to EduVault.</p>
  `;

  accountCard.appendChild(accountWelcome);
}

      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logoutBtn';
      logoutBtn.textContent = 'Logout';
      logoutBtn.className = 'logout-btn';

      logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Logging out...';

        try {
          const logoutResponse = await fetch('/api/auth/logout', {
            method: 'POST'
          });

          const logoutData = await logoutResponse.json();

          if (!logoutResponse.ok) {
            throw new Error(logoutData.error || 'Logout failed.');
          }

          alert('You have been logged out.');
          window.location.reload();

        } catch (error) {
          console.error('Logout error:', error);
          alert('Unable to log out. Please try again.');
          logoutBtn.disabled = false;
          logoutBtn.textContent = 'Logout';
        }
      });

      accountCard.appendChild(logoutBtn);
    } else {
      console.log('No student is logged in.');
    }

  } catch (error) {
    console.error('Login status check failed:', error);
  }
}

checkLoginStatus();
