document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('isLoggedIn') === 'true') {
        finishLogin(localStorage.getItem('userName'), localStorage.getItem('isAdmin') === 'true');
    }
  const messagesBox = document.getElementById('messages');
  const diffBox = document.getElementById('difficulty-buttons');
  const quoteBlock = document.querySelector('.quote');
  const userInput = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');
  const hintBtn = document.getElementById('hint-btn');
  const hintHelp = document.getElementById('hint-help');
  const hintWrapper = document.querySelector('.hint-wrapper');
  const topicsList = document.getElementById('topics-list');
  const layoutBox = document.querySelector('.layout');

  const loginBtn = document.getElementById('login-btn');
  const loginModal = document.getElementById('login-modal');
  const modalClose = document.getElementById('modal-close');
  const userTab = document.getElementById('user-tab');
  const adminTab = document.getElementById('admin-tab');
  const userForm = document.getElementById('user-form');
  const adminForm = document.getElementById('admin-form');
  const adminAttemptsInfo = document.getElementById('admin-attempts');

  const profileDiv = document.getElementById('profile');
  const userNameSp = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const adminBanner = document.getElementById('admin-banner');

  const uploadBtn = document.getElementById('upload-syllabus-btn');
  const fileInput = document.getElementById('syllabus-file');

  let selectedTopic = null;
  let currentDifficulty = null;
  let isAdmin = false;
  let syllabusLoaded = false;
  let adminFails = parseInt(localStorage.getItem('adminFailedAttempts') || '0', 10);

  profileDiv.style.display = 'none';
  logoutBtn.style.display = 'none';
  userInput.disabled = true;
  submitCodeBtn.disabled = true;
  hintBtn.disabled = true;
  topicsList.innerHTML = '';
  topicsList.style.display = 'none';
  const noTopicsMsg = document.createElement('div');
  noTopicsMsg.textContent = '⏳ Please wait until the administrator uploads the syllabus 😔';
  noTopicsMsg.style.cssText = 'color:#999;text-align:center;margin-top:16px;font-size:14px;';
  topicsList.parentNode.insertBefore(noTopicsMsg, topicsList.nextSibling);

  const hideQuote = () => quoteBlock && (quoteBlock.style.display = 'none');

  const showMessage = (t, s = 'bot') => {
    const d = document.createElement('div');
    d.className = `message ${s}`;
    d.textContent = t;
    messagesBox.appendChild(d);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  const showCodeMessage = c => {
    const d = document.createElement('div');
    d.className = 'message user';
    const p = document.createElement('pre');
    p.textContent = c;
    d.appendChild(p);
    messagesBox.appendChild(d);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  const fetchText = async (u, fb, o = {}) => {
    try {
      const r = await fetch(u, o);
      if (!r.ok) return `Error ${r.status}: ${await r.text()}`;
      const ct = r.headers.get('content-type') || '';
      return ct.includes('application/json') ? (await r.json()).message || 'OK' : await r.text();
    } catch (e) {
      return `Network error: ${e.message}`;
    }
  };


const updateTopicList = arr => {
    syllabusLoaded = arr.length > 0;
    topicsList.innerHTML = '';
    if (!syllabusLoaded) {
        topicsList.style.display = 'none';
        noTopicsMsg.style.display = isAdmin ? 'none' : 'block';
        userInput.disabled = true;
        submitCodeBtn.disabled = true;
        hintBtn.disabled = true;
        diffBox.style.display = 'none';
        selectedTopic = null;
        return;
    }
    topicsList.style.display = 'flex';
    noTopicsMsg.style.display = 'none';
    userInput.disabled = false;
    submitCodeBtn.disabled = false;
    arr.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'topic-btn';
        btn.textContent = t.trim();
        topicsList.appendChild(btn);
        btn.addEventListener('click', () => handleTopic(btn));
    });
};

const handleTopic = btn => {
  if (!syllabusLoaded) return;
  hideQuote();
  document.querySelectorAll('.topic-btn').forEach(e => e.classList.remove('active-topic'));
  btn.classList.add('active-topic');
  selectedTopic = btn.textContent.trim().toLowerCase().replace(/\s+/g, '_');
  hintBtn.disabled = true;
  showMessage(btn.textContent, 'user');
  showMessage('Select difficulty 👇', 'bot');
  diffBox.style.display = 'flex';
};

  fetch('/get_syllabus')
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (d && Array.isArray(d.topics)) updateTopicList(d.topics);
    })
    .catch(() => {});

  const openModal = () => loginModal.classList.remove('hidden');
  const closeModal = () => loginModal.classList.add('hidden');
  loginBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);

  userTab.addEventListener('click', () => {
    userTab.classList.add('active');
    adminTab.classList.remove('active');
    userForm.classList.remove('hidden');
    adminForm.classList.add('hidden');
  });
  adminTab.addEventListener('click', () => {
    adminTab.classList.add('active');
    userTab.classList.remove('active');
    adminForm.classList.remove('hidden');
    userForm.classList.add('hidden');
  });

  userForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('user-name-input').value.trim();
    const mail = document.getElementById('user-email-input').value.trim();
    const pwd = document.getElementById('user-password-input').value.trim();
    if (!name || !mail || !pwd) return;
    finishLogin(name, false);
  });

  adminForm.addEventListener('submit', e => {
    e.preventDefault();
    if (adminFails >= 3) return;
    const pwd = document.getElementById('admin-password-input').value.trim();
    if (pwd === 'admin123') {
      adminFails = 0;
      localStorage.setItem('adminFailedAttempts', '0');
      adminAttemptsInfo.textContent = '';
      finishLogin('Admin', true);
    } else {
      adminFails += 1;
      localStorage.setItem('adminFailedAttempts', adminFails);
      adminAttemptsInfo.textContent = `Wrong password (${adminFails}/3)`;
      if (adminFails >= 3) {
        adminAttemptsInfo.textContent = 'UI locked after 3 failed attempts.';
        adminForm.querySelector('input').disabled = true;
        adminForm.querySelector('button').disabled = true;
      }
    }
  });

  const adjustLayoutHeight = () => {
    const bannerHeight = adminBanner.classList.contains('hidden') ? 0 : adminBanner.offsetHeight;
    layoutBox.style.height = `calc(100vh - 64px - ${bannerHeight}px)`;
  };

  const finishLogin = (name, admin) => {
    isAdmin = admin;
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', name);
    localStorage.setItem('isAdmin', admin);
    profileDiv.style.display = 'flex';
    logoutBtn.style.display = 'inline-block';
    userNameSp.textContent = name;
    loginBtn.style.display = 'none';
    adminBanner.classList.toggle('hidden', !admin);
    uploadBtn.style.display = admin ? 'block' : 'none';
    if (admin && !syllabusLoaded) noTopicsMsg.style.display = 'none';
    closeModal();
    adjustLayoutHeight();
  };

  logoutBtn.addEventListener('click', () => {
    isAdmin = false;
    profileDiv.style.display = 'none';
    logoutBtn.style.display = 'none';
    loginBtn.style.display = 'inline-block';
    adminBanner.classList.add('hidden');
    uploadBtn.style.display = 'none';
    if (!syllabusLoaded) noTopicsMsg.style.display = 'block';
    adjustLayoutHeight();
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.setAttribute('accept', '.txt,application/pdf');

fileInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;

    const name = f.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.pdf')) {
        return alert('Only .txt and .pdf files allowed');
    }
    let text;
    if (name.endsWith('.txt')) {
        text = await new Promise(res => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.readAsText(f);
        });
    } else {
        const buf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let full = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            full += content.items.map(it => it.str).join(' ') + '\n';
        }
        text = full;
    }

    const idx = text.search(/Tentative Course Schedule:/i);
    const scheduleText = idx >= 0 ? text.slice(idx) : text;

    const endIdx = scheduleText.search(/Means of Evaluation:/i);
    const scheduleBlock = endIdx >= 0 ? scheduleText.slice(0, endIdx) : scheduleText;

    const re = /Week\s*\d+\s+(.+?)(?=Week\s*\d+\s+|$)/gis;
    const topics = [];
    let m;
    while ((m = re.exec(scheduleBlock)) !== null) {
        topics.push(m[1].trim());
    }

    if (topics.length === 0) {
        console.log('Parsed chunk:', scheduleText);
        return alert('No course topics found in the uploaded file.');
    }

    updateTopicList(topics);
    try {
        const response = await fetch('/save_syllabus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topics })
        });
        if (response.ok) {
            alert('Syllabus uploaded ✅');
        } else {
            const error = await response.text();
            showMessage(`Failed to upload syllabus: ${error}`, 'bot');
        }
    } catch (e) {
        showMessage(`Failed to upload syllabus: ${e.message}`, 'bot');
    }
});



  if (adminFails >= 3) {
    adminAttemptsInfo.textContent = 'UI locked after 3 failed attempts.';
    adminForm.querySelector('input').disabled = true;
    adminForm.querySelector('button').disabled = true;
  }

  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });

  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCodeBtn.click();
    }
  });

  window.chooseDifficulty = async level => {
    if (!syllabusLoaded) return;
    hideQuote();
    if (!selectedTopic) return showMessage('❗️ Please select topic first', 'bot');
    currentDifficulty = level;
    const labels = { beginner: '🟢 Beginner', medium: '🟡 Medium', hard: '🔴 Hard' };
    showMessage(labels[level], 'user');
    showMessage('Generating task…', 'bot');
    const task = await fetchText(
      `/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`,
      'Failed to generate task!'
    );
    showMessage(`📝 Task:\n${task}`, 'bot');
    hintBtn.disabled = true;
  };

  submitCodeBtn.addEventListener('click', async () => {
    if (!syllabusLoaded) return;
    if (!selectedTopic) return showMessage('❗️ Please select topic before sending code', 'bot');
    if (!currentDifficulty) return showMessage('❗️ Please select difficulty before sending code', 'bot');
    const code = userInput.value.trim();
    if (!code) return;
    hideQuote();
    showCodeMessage(code);
    hintBtn.disabled = false;
    userInput.value = '';
    userInput.style.height = 'auto';
    const resp = await fetchText('/submit_code', 'Failed to submit code.', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: selectedTopic, difficulty: currentDifficulty, code })
    });
    showMessage(resp, 'bot');
  });

  hintBtn.addEventListener('click', async () => {
    if (!syllabusLoaded) return;
    if (!selectedTopic) return showMessage('❗️ Please select topic first', 'bot');
    if (!currentDifficulty) return showMessage('❗️ Please select difficulty first', 'bot');
    showMessage('💡 Hint please! 🥺', 'user');
    const hint = await fetchText(
      `/get_hint?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(currentDifficulty)}`,
      'Hint is unavailable!'
    );
    showMessage(`💡 Hint: ${hint}`, 'bot');
  });

  const showHintTip = m => {
    const o = hintWrapper.querySelector('.hint-tooltip');
    if (o) o.remove();
    const t = document.createElement('div');
    t.className = 'hint-tooltip';
    t.textContent = m;
    hintWrapper.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  hintHelp.addEventListener('click', () => {
    if (hintBtn.disabled) showHintTip('❗️ Send code to get a hint');
  });

  adjustLayoutHeight();
});
