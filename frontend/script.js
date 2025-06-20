document.addEventListener('DOMContentLoaded', () => {
  const messagesBox   = document.getElementById('messages');
  const diffBox       = document.getElementById('difficulty-buttons');
  const quoteBlock    = document.querySelector('.quote');
  const userInput     = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');
  const hintBtn       = document.getElementById('hint-btn');
  const hintHelp      = document.getElementById('hint-help');
  const hintWrapper   = document.querySelector('.hint-wrapper');
  const topicsList    = document.getElementById('topics-list');

  const loginBtn   = document.getElementById('login-btn');
  const loginModal = document.getElementById('login-modal');
  const modalClose = document.getElementById('modal-close');
  const userTab    = document.getElementById('user-tab');
  const adminTab   = document.getElementById('admin-tab');
  const userForm   = document.getElementById('user-form');
  const adminForm  = document.getElementById('admin-form');
  const adminAttemptsInfo = document.getElementById('admin-attempts');

  const profileDiv = document.getElementById('profile');
  const userNameSp = document.getElementById('user-name');
  const logoutBtn  = document.getElementById('logout-btn');
  const adminBanner= document.getElementById('admin-banner');

  const uploadBtn  = document.getElementById('upload-syllabus-btn');
  const fileInput  = document.getElementById('syllabus-file');

  let selectedTopic     = null;
  let currentDifficulty = null;
  let taskShown         = false;
  let answerSent        = false;

  let isLoggedIn = false;
  let isAdmin    = false;
  let adminFails = parseInt(localStorage.getItem('adminFailedAttempts') || '0', 10);

  const hideQuote = () => quoteBlock && (quoteBlock.style.display = 'none');

  const showMessage = (text, sender = 'bot') => {
    const el = document.createElement('div');
    el.className = `message ${sender}`;
    el.textContent = text;
    messagesBox.appendChild(el);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  const showCodeMessage = code => {
    const el = document.createElement('div');
    el.className = 'message user';
    const pre = document.createElement('pre');
    pre.textContent = code;
    el.appendChild(pre);
    messagesBox.appendChild(el);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  const fetchText = async (url, fallback, options = {}) => {
    try {
      const r = await fetch(url, options);
      if (!r.ok) return `Error ${r.status}: ${await r.text()}`;
      const ct = r.headers.get('content-type') || '';
      return ct.includes('application/json')
        ? (await r.json()).message || 'OK'
        : await r.text();
    } catch (err) { return `Network error: ${err.message}`; }
  };

  function updateTopicList(arr) {
    topicsList.innerHTML = '';
    arr.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line.trim();
      topicsList.appendChild(li);
      li.addEventListener('click', () => handleTopic(li));
    });
  }

  function handleTopic(li) {
    hideQuote();
    document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active-topic'));
    li.classList.add('active-topic');
    selectedTopic = li.textContent.trim().toLowerCase().replace(/\s+/g, '_');
    taskShown = answerSent = false;
    hintBtn.disabled = true;
    showMessage(li.textContent, 'user');
    showMessage('Select difficulty 👇', 'bot');
    diffBox.style.display = 'flex';
  }

  fetch('/get_syllabus')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && Array.isArray(data.topics) && data.topics.length) updateTopicList(data.topics);
    })
    .catch(() => { });


  const openModal  = () => loginModal.classList.remove('hidden');
  const closeModal = () => loginModal.classList.add('hidden');
  loginBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);

  userTab.addEventListener('click', () => {
    userTab.classList.add('active');   adminTab.classList.remove('active');
    userForm.classList.remove('hidden'); adminForm.classList.add('hidden');
  });
  adminTab.addEventListener('click', () => {
    adminTab.classList.add('active'); userTab.classList.remove('active');
    adminForm.classList.remove('hidden'); userForm.classList.add('hidden');
  });

  userForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('user-name-input').value.trim();
    const mail = document.getElementById('user-email-input').value.trim();
    const pwd  = document.getElementById('user-password-input').value.trim();
    if (!name || !mail || !pwd) return;
    finishLogin(name, false);
  });

  adminForm.addEventListener('submit', e => {
    e.preventDefault();
    if (adminFails >= 3) return;
    const pwd = document.getElementById('admin-password-input').value.trim();
    if (pwd === 'admin123') {
      adminFails = 0; localStorage.setItem('adminFailedAttempts', '0');
      adminAttemptsInfo.textContent = '';
      finishLogin('Admin', true);
    } else {
      adminFails += 1; localStorage.setItem('adminFailedAttempts', adminFails);
      adminAttemptsInfo.textContent = `Wrong password (${adminFails}/3)`;
      if (adminFails >= 3) {
        adminAttemptsInfo.textContent = 'UI locked after 3 failed attempts.';
        adminForm.querySelector('input').disabled  = true;
        adminForm.querySelector('button').disabled = true;
      }
    }
  });

  const finishLogin = (name, admin) => {
    isLoggedIn = true; isAdmin = admin;
    profileDiv.style.display = 'flex';
    userNameSp.textContent   = name;
    loginBtn.style.display   = 'none';
    adminBanner.classList.toggle('hidden', !admin);
    uploadBtn.style.display  = admin ? 'block' : 'none';
    closeModal();
  };

  logoutBtn.addEventListener('click', () => {
    isLoggedIn = isAdmin = false;
    profileDiv.style.display = 'none';
    loginBtn.style.display   = 'inline-block';
    adminBanner.classList.add('hidden');
    uploadBtn.style.display  = 'none';
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith('.txt')) return alert('Only .txt files allowed');

    const reader = new FileReader();
    reader.onload = () => {
      const lines = reader.result.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (!lines.length) return alert('File is empty');

      updateTopicList(lines);
      fetch('/save_syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics: lines })
      }).catch(() => {});
      alert('Syllabus uploaded ✅');
    };
    reader.readAsText(f);
  });

  if (adminFails >= 3) {
    adminAttemptsInfo.textContent = 'UI locked after 3 failed attempts.';
    adminForm.querySelector('input').disabled  = true;
    adminForm.querySelector('button').disabled = true;
  }

  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });

  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCodeBtn.click(); }
  });

  window.chooseDifficulty = async level => {
    hideQuote();
    if (!selectedTopic) return showMessage('❗️ Please select topic first', 'bot');

    currentDifficulty = level;
    const labels = { beginner:'🟢 Beginner', medium:'🟡 Medium', hard:'🔴 Hard' };
    showMessage(labels[level], 'user');
    showMessage('Generating task…', 'bot');

    const task = await fetchText(
      `/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`,
      'Не удалось получить задачу.'
    );
    showMessage(`📝 Task:\n${task}`, 'bot');
    taskShown = answerSent = false;
    hintBtn.disabled = true;
  };

  submitCodeBtn.addEventListener('click', async () => {
    if (!selectedTopic)     return showMessage('❗️ Please select topic before sending code', 'bot');
    if (!currentDifficulty) return showMessage('❗️ Please select difficulty before sending code', 'bot');

    const code = userInput.value.trim();
    if (!code) return;

    hideQuote(); showCodeMessage(code); hintBtn.disabled = false;
    userInput.value = ''; userInput.style.height = 'auto';

    const resp = await fetchText('/submit_code', 'Failed to submit code.', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ topic:selectedTopic, difficulty:currentDifficulty, code })
    });
    showMessage(resp, 'bot');
  });

  hintBtn.addEventListener('click', async () => {
    if (!selectedTopic)     return showMessage('❗️ Please select topic first', 'bot');
    if (!currentDifficulty) return showMessage('❗️ Please select difficulty first', 'bot');

    showMessage('💡 Hint please! 🥺', 'user');
    const hint = await fetchText(
      `/get_hint?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(currentDifficulty)}`,
      'Hint is unavailable!'
    );
    showMessage(`💡 Hint: ${hint}`, 'bot');
  });

  const showHintTip = msg => {
    const old = hintWrapper.querySelector('.hint-tooltip'); if (old) old.remove();
    const tip = document.createElement('div'); tip.className = 'hint-tooltip'; tip.textContent = msg;
    hintWrapper.appendChild(tip); setTimeout(() => tip.remove(), 3000);
  };
  hintHelp.addEventListener('click', () => { if (hintBtn.disabled) showHintTip('❗️ Send code to get a hint'); });
});
