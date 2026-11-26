// Skillora - interactive student platform

const firebaseConfig = {
  projectId: "skillora-learnhub",
  appId: "1:366935673005:web:4dbf674f20eea6be5f1e24",
  storageBucket: "skillora-learnhub.firebasestorage.app",
  apiKey: "AIzaSyDMMkZiv77G2FrHxtRbWHm3Fm6aHpdl4Fg",
  authDomain: "skillora-learnhub.firebaseapp.com",
  messagingSenderId: "366935673005",
  measurementId: "G-X36MLVZJXX"
};
if (window.firebase && !firebase.apps.length) firebase.initializeApp(firebaseConfig);

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach((link) => link.addEventListener('click', () => navLinks.classList.remove('open')));

const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 10));

const store = {
  read(key, fallback) {
    try {
      const value = localStorage.getItem(`skillora_${key}`);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    localStorage.setItem(`skillora_${key}`, JSON.stringify(value));
  }
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    counterObserver.unobserve(el);
    const target = parseFloat(el.getAttribute('data-count'));
    const decimals = target % 1 !== 0 ? 1 : 0;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 1600, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (el.firstChild) el.firstChild.nodeValue = (target * eased).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach((c) => counterObserver.observe(c));

const searchInput = document.getElementById('skillSearch');
const skillsGrid = document.getElementById('skillsGrid');
const noResult = document.getElementById('noResult');
const searchCount = document.getElementById('searchCount');
let activeCategory = 'all';

function normalizeArabic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ْ]/g, '')
    .trim();
}

function runSearch() {
  const query = normalizeArabic(searchInput?.value || '');
  let visibleCount = 0;
  Array.from(skillsGrid.querySelectorAll('.skill-card')).forEach((card) => {
    const haystack = normalizeArabic((card.getAttribute('data-search') || '') + ' ' + card.textContent + ' ' + (card.getAttribute('data-category') || ''));
    const cardCategory = card.getAttribute('data-category');
    const visible = (!query || haystack.includes(query)) && (activeCategory === 'all' || cardCategory === activeCategory);
    card.classList.toggle('hidden', !visible);
    if (visible) visibleCount++;
  });
  if (searchCount) searchCount.textContent = visibleCount ? `${visibleCount} مهارة متاحة` : '0 مهارات';
  if (noResult) noResult.hidden = visibleCount !== 0;
}
searchInput?.addEventListener('input', runSearch);
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((item) => item.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.filter;
    runSearch();
  });
});
runSearch();

const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
let authMode = 'signup';

function openAuth(mode = 'signup') {
  authMode = mode;
  document.getElementById('authTitle').textContent = mode === 'signup' ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
  document.getElementById('authLead').textContent = mode === 'signup' ? 'ابدأ رحلتك في تبادل المهارات' : 'أهلاً بعودتك إلى Skillora';
  const nameField = document.getElementById('nameField');
  nameField.hidden = mode === 'login';
  nameField.querySelector('input').required = mode === 'signup';
  document.querySelector('.auth-submit').textContent = mode === 'signup' ? 'إنشاء الحساب' : 'تسجيل الدخول';
  document.getElementById('authSwitchText').textContent = mode === 'signup' ? 'لديك حساب؟' : 'ليس لديك حساب؟';
  document.getElementById('authSwitch').textContent = mode === 'signup' ? 'تسجيل الدخول' : 'إنشاء حساب';
  authModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
document.querySelectorAll('[data-open-auth]').forEach((button) => button.addEventListener('click', () => openAuth(button.dataset.openAuth)));
document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => { authModal.hidden = true; document.body.style.overflow = ''; }));
document.getElementById('authSwitch')?.addEventListener('click', () => openAuth(authMode === 'signup' ? 'login' : 'signup'));
authForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(authForm);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');
  const name = String(data.get('name') || '').trim();
  const submitButton = authForm.querySelector('.auth-submit');
  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ التنفيذ...';

  fetch(authMode === 'signup' ? '/api/auth/register' : '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(authMode === 'signup'
      ? { name, email, password }
      : { email, password })
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر تنفيذ العملية');
      return body;
    })
    .then((user) => {
      localStorage.setItem('skillora_user', user.name);
      localStorage.setItem('skillora_user_id', String(user.id));
      authModal.hidden = true;
      document.body.style.overflow = '';
      openApp();
      showToast(authMode === 'signup' ? 'تم إنشاء حسابك في قاعدة البيانات بنجاح' : 'تم تسجيل الدخول بنجاح');
    })
    .catch((error) => showToast(error.message))
    .finally(() => {
      submitButton.disabled = false;
      submitButton.textContent = authMode === 'signup' ? 'إنشاء الحساب' : 'تسجيل الدخول';
    });
});

document.getElementById('googleSignInBtn')?.addEventListener('click', async () => {
  const button = document.getElementById('googleSignInBtn');
  if (!window.firebase) {
    showToast('تعذر تحميل Firebase. تحقق من الاتصال بالإنترنت');
    return;
  }
  button.disabled = true;
  button.textContent = 'جارٍ الاتصال بحساب Google...';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await firebase.auth().signInWithPopup(provider);
    const idToken = await result.user.getIdToken();
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'تعذر تسجيل الدخول بحساب Google');
    localStorage.setItem('skillora_user', body.name);
    localStorage.setItem('skillora_user_id', String(body.id));
    authModal.hidden = true;
    document.body.style.overflow = '';
    openApp();
    showToast('تم تسجيل الدخول بحساب Google بنجاح');
  } catch (error) {
    showToast(error.message || 'تم إلغاء تسجيل الدخول بحساب Google');
  } finally {
    button.disabled = false;
    button.innerHTML = '<span class="google-g">G</span>المتابعة بحساب Google';
  }
});

const matches = [
  { name: 'محمد الخليل', role: 'علوم وطب', initial: 'م', category: 'برمجة', skills: ['Python', 'React'], rating: '5.0' },
  { name: 'نور فهد', role: 'هندسة بيانات', initial: 'ن', category: 'ذكاء اصطناعي', skills: ['Machine Learning', 'Python'], rating: '4.8' },
  { name: 'يوسف البرو', role: 'التصوير والفيديو', initial: 'ي', category: 'تصوير', skills: ['Photography', 'Lightroom'], rating: '4.9' },
  { name: 'لينا حنا', role: 'اللغات والتعليم', initial: 'ل', category: 'لغات', skills: ['English', 'Teaching'], rating: '5.0' },
  { name: 'أحمد رحيم', role: 'الموسيقى', initial: 'أ', category: 'موسيقى', skills: ['Guitar', 'Music Theory'], rating: '4.7' },
  { name: 'ريم صالح', role: 'التصميم الرقمي', initial: 'ر', category: 'تصميم', skills: ['Figma', 'UI/UX'], rating: '4.9' },
  { name: 'ريم عبدالله', role: 'القانون والتخطيط', initial: 'ر', category: 'قانون', skills: ['Legal Analysis', 'Planning'], rating: '4.8' },
  { name: 'فارس ناصر', role: 'السينما والمونتاج', initial: 'ف', category: 'محتوى', skills: ['Editing', 'Screenwriting'], rating: '4.8' },
  { name: 'ماجي الحوراني', role: 'البيانات والإحصاء', initial: 'م', category: 'بيانات', skills: ['Data Analysis', 'Excel'], rating: '4.9' },
  { name: 'كريم زيدان', role: 'اللياقة والتغذية', initial: 'ك', category: 'صحة', skills: ['Wellness', 'Nutrition'], rating: '4.7' },
  { name: 'يارا شحاتة', role: 'الكتابة والإعلام', initial: 'ي', category: 'كتابة', skills: ['Writing', 'Storytelling'], rating: '4.9' },
  { name: 'تيسير حداد', role: 'الأمن السيبراني', initial: 'ت', category: 'أمن', skills: ['Cybersecurity', 'Network'], rating: '4.8' }
];

function renderMatches() {
  const matchList = document.getElementById('matchList');
  if (matchList) matchList.innerHTML = matches.slice(0, 3).map((person) => `<div class="match-item"><div class="mini-avatar">${person.initial}</div><div><h4>${person.name}</h4><p>${person.skills.join(' • ')}</p></div><button type="button" data-request-to="${person.name}">طلب تبادل</button></div>`).join('');
  const grid = document.getElementById('studentMatchGrid');
  if (grid) grid.innerHTML = matches.map((person) => `<article class="match-card" data-person="${person.name}" data-category="${person.category}" data-search="${(person.name + ' ' + person.skills.join(' ')).toLowerCase()}"><div class="match-card-head"><div class="mini-avatar">${person.initial}</div><div><h3>${person.name}</h3><p>${person.role} • ★ ${person.rating}</p></div></div><div class="tags">${person.skills.map((skill) => `<span>${skill}</span>`).join('')}</div><div class="match-card-actions"><button type="button" data-request-to="${person.name}">طلب تبادل</button><button type="button" data-profile-to="${person.name}">عرض الملف</button></div></article>`).join('');
  bindRequestButtons();
}
renderMatches();

function filterAppMatches() {
  const query = normalizeArabic(document.getElementById('appSkillSearch')?.value || '');
  const category = document.getElementById('categoryFilter')?.value || '';
  const minRating = parseFloat(document.getElementById('ratingFilter')?.value || '0') || 0;
  const sort = document.getElementById('sortMatches')?.value || 'default';
  const cards = Array.from(document.querySelectorAll('.match-card'));
  cards.forEach((card) => {
    const person = matches.find((item) => item.name === card.dataset.person);
    const visible = (!query || normalizeArabic(card.dataset.search).includes(query))
      && (!category || card.dataset.category === category)
      && (!minRating || parseFloat(person?.rating || '0') >= minRating);
    card.classList.toggle('hidden', !visible);
  });
  const visibleCards = cards.filter((card) => !card.classList.contains('hidden'));
  if (sort === 'rating') {
    visibleCards.sort((a, b) => parseFloat(matches.find((m) => m.name === b.dataset.person).rating) - parseFloat(matches.find((m) => m.name === a.dataset.person).rating));
  } else if (sort === 'name') {
    visibleCards.sort((a, b) => a.dataset.person.localeCompare(b.dataset.person, 'ar'));
  }
  const grid = document.getElementById('studentMatchGrid');
  visibleCards.forEach((card) => grid.appendChild(card));
  const count = document.getElementById('exploreCount');
  if (count) count.textContent = visibleCards.length ? `${visibleCards.length} نتيجة مطابقة` : 'لا توجد نتائج مطابقة — جرّب تعديل البحث';
}
document.getElementById('appSkillSearch')?.addEventListener('input', filterAppMatches);
document.getElementById('categoryFilter')?.addEventListener('change', filterAppMatches);
document.getElementById('ratingFilter')?.addEventListener('change', filterAppMatches);
document.getElementById('sortMatches')?.addEventListener('change', filterAppMatches);
filterAppMatches();

// ===== Global search (landing nav) — deep search across skills, students and sessions =====
const globalSearch = document.getElementById('globalSearch');
const globalResults = document.getElementById('globalSearchResults');
const globalLabels = { skill: 'مهارة', student: 'طالب', session: 'جلسة' };
const globalIcons = { skill: '🎓', student: '👤', session: '📅' };

function buildGlobalIndex() {
  const skills = Array.from(document.querySelectorAll('.skill-card')).map((card) => ({
    type: 'skill',
    title: card.querySelector('h3')?.textContent.trim() || '',
    meta: 'مهارة • ' + (card.querySelector('.skill-meta')?.textContent.trim() || ''),
    search: (card.getAttribute('data-search') || '') + ' ' + card.textContent,
    el: card
  }));
  const students = matches.map((person) => ({
    type: 'student',
    title: person.name,
    meta: person.role + ' • ' + person.skills.join('، '),
    search: person.name + ' ' + person.role + ' ' + person.skills.join(' '),
    el: null
  }));
  const sessions = Array.from(document.querySelectorAll('.session-card')).map((card) => ({
    type: 'session',
    title: card.querySelector('h3')?.textContent.trim() || '',
    meta: 'جلسة • ' + (card.querySelector('p')?.textContent.trim() || ''),
    search: card.textContent,
    el: card
  }));
  return [...skills, ...students, ...sessions];
}

const globalIndex = buildGlobalIndex();

function renderGlobalResults() {
  if (!globalResults) return;
  const query = normalizeArabic(globalSearch?.value || '');
  if (query.length < 2) {
    globalResults.hidden = true;
    globalResults.innerHTML = '';
    return;
  }
  const hits = globalIndex
    .filter((item) => normalizeArabic(item.search + ' ' + item.title + ' ' + item.meta).includes(query))
    .slice(0, 8);
  globalResults.innerHTML = hits.length
    ? hits.map((item) => `<button type="button" class="global-hit" data-global-type="${item.type}" data-global-title="${item.title.replace(/"/g, '&quot;')}"><span class="global-hit-icon">${globalIcons[item.type]}</span><span class="global-hit-text"><strong>${item.title}</strong><small>${item.meta}</small></span><span class="global-hit-type">${globalLabels[item.type]}</span></button>`).join('')
    : '<div class="global-empty">لا توجد نتائج مطابقة</div>';
  globalResults.hidden = false;
}

globalSearch?.addEventListener('input', renderGlobalResults);
globalSearch?.addEventListener('focus', renderGlobalResults);
document.addEventListener('click', (event) => {
  if (globalResults && !event.target.closest('#navSearch')) globalResults.hidden = true;
});
globalResults?.addEventListener('click', (event) => {
  const hit = event.target.closest('.global-hit');
  if (!hit) return;
  const type = hit.dataset.globalType;
  const title = hit.dataset.globalTitle;
  globalResults.hidden = true;
  globalSearch.value = '';
  if (type === 'skill') {
    searchInput.value = title;
    activeCategory = 'all';
    document.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.filter === 'all'));
    runSearch();
    document.getElementById('skills').scrollIntoView({ behavior: 'smooth' });
  } else if (type === 'student') {
    openApp();
    switchView('explore');
    filterAppMatches();
    showToast(`عرض ملف الطالب: ${title}`);
  } else if (type === 'session') {
    document.getElementById('sessions').scrollIntoView({ behavior: 'smooth' });
  }
});

const appModal = document.getElementById('appModal');
function showUserName(fullName) {
  const name = (fullName || '').trim();
  if (!name) return;
  document.querySelector('.app-avatar').textContent = name.charAt(0);
  const welcome = document.querySelector('.welcome-banner h3');
  if (welcome) welcome.textContent = `مرحباً ${name.split(/\s+/)[0]} 👋`;
}
function openApp() {
  appModal.hidden = false;
  document.body.style.overflow = 'hidden';
  showUserName(localStorage.getItem('skillora_user'));
}
function closeApp() { appModal.hidden = true; document.body.style.overflow = ''; }
document.querySelectorAll('[data-open-app]').forEach((button) => button.addEventListener('click', openApp));
document.querySelectorAll('[data-close-app]').forEach((button) => button.addEventListener('click', closeApp));

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) return;
    const user = await response.json();
    localStorage.setItem('skillora_user', user.name);
    localStorage.setItem('skillora_user_id', String(user.id));
    showUserName(user.name);
  } catch {
    // The landing page can remain usable when no session is active.
  }
}
loadCurrentUser();

const viewTitles = { dashboard: 'لوحة التحكم', explore: 'استكشف المهارات', requests: 'طلبات التبادل', exchanges: 'تبادلاتي', profile: 'ملفي الشخصي', admin: 'لوحة الإدارة' };
function switchView(view) {
  document.querySelectorAll('.app-view').forEach((section) => section.classList.remove('active'));
  document.getElementById(`view-${view}`)?.classList.add('active');
  document.querySelectorAll('.app-nav button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.getElementById('appTitle').textContent = viewTitles[view] || '';
  document.querySelector('.app-content').scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'profile') {
    renderProfile();
    loadMySkills();
  }
}
document.querySelectorAll('.app-nav [data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.viewLink)));

const receivedRequests = store.read('receivedRequests', [
  { name: 'محمد الخليل', skill: 'React مقابل تحليل بيانات', time: 'منذ ساعتين' },
  { name: 'نور فهد', skill: 'Python مقابل تصميم UI', time: 'أمس' },
  { name: 'يوسف البرو', skill: 'تصوير مقابل الإنجليزية', time: 'منذ يومين' },
  { name: 'ماجي الحوراني', skill: 'Excel مقابل التصميم', time: 'منذ 3 ساعات' },
  { name: 'يارا شحاتة', skill: 'كتابة مقابل التسويق', time: 'أمس' },
  { name: 'تيسير حداد', skill: 'شبكات مقابل دعم فني', time: 'منذ 5 ساعات' }
]);
const sentRequests = store.read('sentRequests', [
  { name: 'لينا حنا', skill: 'تصميم مقابل الإنجليزية', time: 'منذ 3 ساعات' },
  { name: 'أحمد رحيم', skill: 'React مقابل عزف الجيتار', time: 'أمس' },
  { name: 'ريم صالح', skill: 'هوية بصرية مقابل تصوير', time: 'منذ ساعة' },
  { name: 'فارس ناصر', skill: 'مونتاج مقابل إنجليزي', time: 'منذ 4 ساعات' }
]);

function syncCounts() {
  const pairs = [
    ['[data-request-tab="received"] span', receivedRequests.length],
    ['[data-request-tab="sent"] span', sentRequests.length],
    ['[data-exchange-tab="active"] span', activeExchanges.length],
    ['[data-exchange-tab="completed"] span', completedExchanges.length],
    ['#requestBadge', receivedRequests.length]
  ];
  pairs.forEach(([selector, value]) => { const el = document.querySelector(selector); if (el) el.textContent = value; });
}

function renderRequests(type = 'received') {
  const list = type === 'received' ? receivedRequests : sentRequests;
  document.getElementById('requestList').innerHTML = list.map((request) => `<div class="request-row"><div class="mini-avatar">${request.name.charAt(0)}</div><div><h3>${request.name}</h3><p>${request.skill} • ${request.time}</p></div>${type === 'received' ? `<div class="row-actions"><button class="accept" type="button" data-accept="${request.name}">قبول</button><button type="button" data-reject="${request.name}">رفض</button></div>` : `<span class="status-pill pending">بانتظار الرد</span><div class="row-actions"><button type="button" data-cancel="${request.name}">إلغاء</button></div>`}</div>`).join('');
}
renderRequests();
document.querySelectorAll('[data-request-tab]').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('[data-request-tab]').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  renderRequests(tab.dataset.requestTab);
}));
document.getElementById('requestList')?.addEventListener('click', (event) => {
  const accept = event.target.dataset.accept;
  const reject = event.target.dataset.reject;
  if (accept) {
    receivedRequests.splice(receivedRequests.findIndex((item) => item.name === accept), 1);
    store.write('receivedRequests', receivedRequests);
    renderRequests('received');
    syncCounts();
    showToast(`تم قبول طلب ${accept}`);
  } else if (reject) {
    receivedRequests.splice(receivedRequests.findIndex((item) => item.name === reject), 1);
    store.write('receivedRequests', receivedRequests);
    renderRequests('received');
    syncCounts();
    showToast('تم رفض الطلب');
  } else if (event.target.dataset.cancel) showToast('تم إلغاء الطلب');
});

const activeExchanges = store.read('activeExchanges', [
  { name: 'محمد الخليل', skill: 'React مقابل تحليل بيانات', status: 'قادم • الأربعاء' },
  { name: 'ريم صالح', skill: 'UI/UX مقابل JavaScript', status: 'قيد التنفيذ' },
  { name: 'ماجي الحوراني', skill: 'إحصاء مقابل تصميم', status: 'قادم • السبت' },
  { name: 'تيسير حداد', skill: 'أمن سيبراني مقابل دعم', status: 'قيد التنفيذ' }
]);
const completedExchanges = store.read('completedExchanges', [
  { name: 'نور فهد', skill: 'Python مقابل التصميم', status: 'مكتمل' },
  { name: 'يوسف البرو', skill: 'تصوير مقابل الإنجليزية', status: 'مكتمل' },
  { name: 'لينا حنا', skill: 'إنجليزي مقابل بيانو', status: 'مكتمل' },
  { name: 'يارا شحاتة', skill: 'كتابة مقابل تسويق', status: 'مكتمل' },
  { name: 'كريم زيدان', skill: 'لياقة مقابل تغذية', status: 'مكتمل' }
]);
function renderExchanges(type = 'active') {
  const list = type === 'active' ? activeExchanges : completedExchanges;
  document.getElementById('exchangeList').innerHTML = list.map((exchange) => `<div class="exchange-row"><div class="mini-avatar">${exchange.name.charAt(0)}</div><div><h3>${exchange.name}</h3><p>${exchange.skill}</p></div><span class="status-pill ${type === 'completed' ? 'completed' : ''}">${exchange.status}</span><div class="row-actions">${type === 'active' ? '<button type="button">تفاصيل</button><button type="button">إكمال</button>' : '<button type="button" data-review>تقييم</button>'}</div></div>`).join('');
}
renderExchanges();
syncCounts();
document.querySelectorAll('[data-exchange-tab]').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('[data-exchange-tab]').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  renderExchanges(tab.dataset.exchangeTab);
}));
document.getElementById('exchangeList')?.addEventListener('click', (event) => {
  if (event.target.dataset.review !== undefined) {
    openReview();
  } else if (event.target.textContent === 'إكمال') {
    const row = event.target.closest('.exchange-row');
    const name = row.querySelector('h3').textContent;
    const index = activeExchanges.findIndex((exchange) => exchange.name === name);
    if (index >= 0) {
      const exchange = activeExchanges.splice(index, 1)[0];
      exchange.status = 'مكتمل';
      completedExchanges.unshift(exchange);
      store.write('activeExchanges', activeExchanges);
      store.write('completedExchanges', completedExchanges);
      renderExchanges('active');
      showToast(`تم إكمال تبادل ${name}`);
    }
  }
});

const teachSkills = store.read('teachSkills', ['UI/UX Design', 'Figma', 'HTML & CSS']);
const learnSkills = store.read('learnSkills', ['React', 'Machine Learning']);
function renderProfileSkills() {
  document.getElementById('teachSkills').innerHTML = teachSkills.map((skill) => `<span>${skill}</span>`).join('');
  document.getElementById('learnSkills').innerHTML = learnSkills.map((skill) => `<span>${skill}</span>`).join('');
}
renderProfileSkills();
async function loadMySkills() {
  if (currentProfile !== 'سارة الأحمد') return;
  try {
    const response = await fetch('/api/user-skills/me', { credentials: 'include' });
    if (!response.ok) return;
    const skills = await response.json();
    teachSkills.splice(0, teachSkills.length, ...skills.filter((skill) => skill.skillType === 'Teach').map((skill) => skill.skillName));
    learnSkills.splice(0, learnSkills.length, ...skills.filter((skill) => skill.skillType === 'Learn').map((skill) => skill.skillName));
    renderProfileSkills();
  } catch {
    // Keep the prototype fallback skills until a database session is available.
  }
}
document.getElementById('addSkillBtn')?.addEventListener('click', () => { document.getElementById('skillForm').hidden = false; });
document.getElementById('skillForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = document.getElementById('skillName').value.trim();
  if (!name) return;
  const skillType = document.getElementById('skillType').value === 'teach' ? 'Teach' : 'Learn';
  fetch('/api/user-skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ skillName: name, skillType })
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر حفظ المهارة');
      return body;
    })
    .then(() => {
      (skillType === 'Teach' ? teachSkills : learnSkills).push(name);
      store.write('teachSkills', teachSkills);
      store.write('learnSkills', learnSkills);
      renderProfileSkills();
      form.reset();
      form.hidden = true;
      showToast('تمت إضافة المهارة وحفظها في قاعدة البيانات');
    })
    .catch((error) => showToast(error.message));
});

const exchangeModal = document.getElementById('exchangeModal');
function openExchange(name = '') {
  document.getElementById('exchangeTarget').textContent = name ? `إرسال طلب تبادل إلى ${name}` : 'اختر مهارة لبدء تبادل معرفي.';
  exchangeModal.hidden = false;
  document.body.style.overflow = 'hidden';
}
const studentProfiles = {
  'سارة الأحمد': { name: 'سارة الأحمد', major: 'هندسة برمجيات', rating: '4.9', reviews: 14, initial: 'س', bio: 'مصممة منتجات مهتمة ببناء تجارب مستخدم بسيطة ومدربة على مبادئ Figma والتصميم التفاعلي.', teach: ['UI/UX Design', 'Figma', 'HTML & CSS'], learn: ['React', 'Machine Learning'] },
  'محمد الخليل': { name: 'محمد الخليل', major: 'الطب', rating: '5.0', reviews: 9, initial: 'م', bio: 'باحث في الكيمياء الحيوية، بعلّم أساسيات الطب والبحث العلمي بطريقة مبسطة.', teach: ['Biology', 'Chemistry'], learn: ['React', 'Product Development'] },
  'نور فهد': { name: 'نور فهد', major: 'علوم البيانات', rating: '4.8', reviews: 21, initial: 'ن', bio: 'مهندسة Machine Learning بتحب تبسّط الذكاء الاصطناعي للمبتدئين.', teach: ['Machine Learning', 'Python'], learn: ['Public Speaking', 'Design'] },
  'يوسف البرو': { name: 'يوسف البرو', major: 'الفنون البصرية', rating: '4.9', reviews: 11, initial: 'ي', bio: 'فوتوغراف محترف، بيدرس أساسيات التصوير والإضاءة للمبتدئين.', teach: ['Photography', 'Lightroom'], learn: ['English', 'Marketing'] },
  'لينا حنا': { name: 'لينا حنا', major: 'اللغات والتعليم', rating: '5.0', reviews: 17, initial: 'ل', bio: 'معلمة لغة ومتدربة على البيانو، بتحب تشارك أساليب التدريس الفعالة.', teach: ['English', 'Teaching'], learn: ['Piano', 'Music Theory'] },
  'أحمد الرحيم': { name: 'أحمد الرحيم', major: 'الموسيقى', rating: '4.7', reviews: 7, initial: 'أ', bio: 'موسيقي جيتار، بيعلّم العزف من الصفر خطوة بخطوة.', teach: ['Guitar', 'Music Theory'], learn: ['Piano', 'Audio Production'] },
  'ريم صالح': { name: 'ريم صالح', major: 'التصميم الرقمي', rating: '4.9', reviews: 13, initial: 'ر', bio: 'مصممة رقمية متخصصة في الهوية البصرية وبناء العلامات.', teach: ['Branding', 'Illustrator'], learn: ['Motion Design', '3D'] },
  'ريم عبدالله': { name: 'ريم عبدالله', major: 'القانون', rating: '4.8', reviews: 12, initial: 'ر', bio: 'محامية بتحب تعلّم مهارات التفكير القانوني والتخطيط.', teach: ['Legal Analysis', 'Planning'], learn: ['Negotiation', 'Research'] },
  'فارس ناصر': { name: 'فارس ناصر', major: 'السينما', rating: '4.8', reviews: 8, initial: 'ف', bio: 'مخرج أفلام صغير، بيدرس المونتاج وكتابة السيناريو.', teach: ['Editing', 'Screenwriting'], learn: ['Cinematography', 'Sound'] },
  'ماجي الحوراني': { name: 'ماجي الحوراني', major: 'البيانات', rating: '4.9', reviews: 16, initial: 'م', bio: 'باحثة بيانات بتشرح الإحصاء والتحليل بأسلوب بسيط.', teach: ['Data Analysis', 'Excel'], learn: ['Power BI', 'Statistics'] },
  'كريم زيدان': { name: 'كريم زيدان', major: 'اللياقة والتغذية', rating: '4.7', reviews: 6, initial: 'ك', bio: 'مدرب لياقة وتغذية، بيعلّم عادات صحية تناسب جدول الطلاب.', teach: ['Wellness', 'Nutrition'], learn: ['Yoga', 'Stretching'] },
  'يارا شحاتة': { name: 'يارا شحاتة', major: 'الإعلام', rating: '4.9', reviews: 13, initial: 'ي', bio: 'كاتبة محتوى وباحثة في السرد الرقمي.', teach: ['Writing', 'Storytelling'], learn: ['Copywriting', 'SEO'] },
  'تيسير حداد': { name: 'تيسير حداد', major: 'الأمن السيبراني', rating: '4.8', reviews: 10, initial: 'ت', bio: 'خبير أمن سيبراني، بيعلّم أساسيات الحماية والشبكات.', teach: ['Cybersecurity', 'Network'], learn: ['Ethical Hacking', 'Linux'] }
};
let currentProfile = 'سارة الأحمد';

function renderProfile() {
  const profile = studentProfiles[currentProfile] || studentProfiles['سارة الأحمد'];
  const avatar = document.getElementById('profileAvatar');
  const name = document.getElementById('profileName');
  const major = document.getElementById('profileMajor');
  const rating = document.getElementById('profileRating');
  const bio = document.getElementById('profileBio');
  if (!avatar || !name) return;
  avatar.textContent = profile.initial;
  name.textContent = profile.name;
  major.textContent = 'التخصص: ' + profile.major;
  rating.innerHTML = `★ ${profile.rating} <span>(${profile.reviews} مراجعة)</span>`;
  bio.textContent = profile.bio;
  document.getElementById('teachSkills').innerHTML = profile.teach.map((skill) => `<span>${skill}</span>`).join('');
  document.getElementById('learnSkills').innerHTML = profile.learn.map((skill) => `<span>${skill}</span>`).join('');
  const isSelf = profile.name === 'سارة الأحمد';
  document.getElementById('addSkillBtn').style.display = isSelf ? '' : 'none';
  document.getElementById('skillForm').hidden = true;
}

function bindRequestButtons() {
  document.querySelectorAll('[data-request-to]').forEach((button) => button.addEventListener('click', () => openExchange(button.dataset.requestTo)));
  document.querySelectorAll('[data-profile-to]').forEach((button) => button.addEventListener('click', () => {
    currentProfile = button.dataset.profileTo;
    renderProfile();
    switchView('profile');
  }));
}
document.querySelectorAll('[data-close-exchange]').forEach((button) => button.addEventListener('click', () => { exchangeModal.hidden = true; document.body.style.overflow = ''; }));
document.getElementById('exchangeForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const target = document.getElementById('exchangeTarget').textContent.replace('إرسال طلب تبادل إلى ', '');
  const offered = document.getElementById('offerSkill').value;
  const wanted = document.getElementById('wantSkill').value.trim();
  fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ receiverName: target, offeredSkillName: offered, requestedSkillName: wanted })
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر إرسال الطلب');
      return body;
    })
    .then(() => {
      exchangeModal.hidden = true;
      document.body.style.overflow = '';
      sentRequests.unshift({ name: target, skill: `${offered} مقابل ${wanted}`, time: 'الآن' });
      store.write('sentRequests', sentRequests);
      showToast('تم إرسال طلب التبادل وحفظه في قاعدة البيانات');
    })
    .catch((error) => showToast(error.message));
});

const reviewModal = document.getElementById('reviewModal');
let selectedRating = 5;
function openReview() { reviewModal.hidden = false; document.body.style.overflow = 'hidden'; }
document.querySelectorAll('[data-close-review]').forEach((button) => button.addEventListener('click', () => { reviewModal.hidden = true; document.body.style.overflow = ''; }));
document.querySelectorAll('#starRating button').forEach((star) => star.addEventListener('click', () => {
  selectedRating = Number(star.dataset.rating);
  document.querySelectorAll('#starRating button').forEach((item) => item.classList.toggle('active', Number(item.dataset.rating) <= selectedRating));
}));
document.getElementById('starRating')?.querySelector('[data-rating="5"]')?.click();
document.getElementById('reviewForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const comment = document.getElementById('reviewComment').value.trim();
  fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ requestId: 0, reviewedUserId: 0, rating: selectedRating, comment })
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر حفظ التقييم');
      return body;
    })
    .then(() => {
      reviewModal.hidden = true;
      document.body.style.overflow = '';
      showToast(`تم حفظ تقييمك بـ ${selectedRating} نجوم في قاعدة البيانات`);
      event.target.reset();
    })
    .catch((error) => showToast(error.message));
});

const adminUsers = store.read('adminUsers', [
  { name: 'سارة الأحمد', major: 'هندسة برمجيات', status: 'نشط', exchanges: 14 },
  { name: 'محمد الخليل', major: 'الطب', status: 'نشط', exchanges: 9 },
  { name: 'نور فهد', major: 'علوم البيانات', status: 'نشط', exchanges: 21 },
  { name: 'يوسف البرو', major: 'الفنون البصرية', status: 'موقوف مؤقتاً', exchanges: 11 },
  { name: 'ريم صالح', major: 'التصميم الرقمي', status: 'نشط', exchanges: 13 },
  { name: 'فارس ناصر', major: 'السينما', status: 'نشط', exchanges: 8 },
  { name: 'ماجي الحوراني', major: 'البيانات', status: 'نشط', exchanges: 16 },
  { name: 'يارا شحاتة', major: 'الإعلام', status: 'نشط', exchanges: 13 }
]);
const adminTable = document.getElementById('adminTable');
function renderAdminTable() {
  if (!adminTable) return;
  adminTable.innerHTML = adminUsers.map((user, index) => `<tr><td>${user.name}</td><td>${user.major}</td><td><span class="status-pill ${user.status.includes('موقوف') ? 'pending' : ''}">${user.status}</span></td><td>${user.exchanges}</td><td><button type="button" data-admin-action="${index}">${user.status.includes('موقوف') ? 'تفعيل' : 'تعطيل'}</button></td></tr>`).join('');
}
renderAdminTable();
async function loadDatabaseUsers() {
  try {
    const response = await fetch('/api/users', { credentials: 'include' });
    if (!response.ok) return;
    const users = await response.json();
    adminUsers.splice(0, adminUsers.length, ...users.map((user) => ({
      id: user.id,
      name: user.name,
      major: user.university || 'طالب مسجل',
      status: user.isActive ? 'نشط' : 'موقوف مؤقتاً',
      exchanges: 0
    })));
    renderAdminTable();
  } catch {
    // The sample records remain available when the API is unreachable.
  }
}
loadDatabaseUsers();
adminTable?.addEventListener('click', (event) => {
  const index = Number(event.target.dataset.adminAction);
  if (!Number.isNaN(index) && event.target.dataset.adminAction !== undefined) {
    const isActive = adminUsers[index].status === 'موقوف مؤقتاً';
    const request = adminUsers[index].id
      ? fetch(`/api/users/${adminUsers[index].id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isActive })
        })
      : Promise.resolve({ ok: true });
    request
      .then((response) => {
        if (!response.ok) throw new Error('تعذر تحديث حالة المستخدم');
        adminUsers[index].status = isActive ? 'نشط' : 'موقوف مؤقتاً';
        store.write('adminUsers', adminUsers);
        renderAdminTable();
        showToast(`تم تحديث حالة ${adminUsers[index].name}`);
      })
      .catch((error) => showToast(error.message));
  }
});

const adminSkills = store.read('adminSkills', [
  { name: 'React', category: 'برمجة', students: 240, status: 'نشط' },
  { name: 'UI/UX', category: 'تصميم', students: 180, status: 'نشط' },
  { name: 'Python', category: 'ذكاء اصطناعي', students: 150, status: 'نشط' },
  { name: 'English', category: 'لغات', students: 320, status: 'نشط' },
  { name: 'Excel', category: 'بيانات', students: 140, status: 'نشط' },
  { name: 'Writing', category: 'كتابة', students: 75, status: 'نشط' },
  { name: 'Cybersecurity', category: 'أمن', students: 90, status: 'نشط' },
  { name: 'Yoga', category: 'صحة', students: 65, status: 'موقوف' }
]);
const adminRequests = store.read('adminRequests', [
  { sender: 'محمد الخليل', receiver: 'سارة الأحمد', skill: 'React مقابل UI/UX', status: 'معلق' },
  { sender: 'نور فهد', receiver: 'يوسف البرو', skill: 'Python مقابل التصوير', status: 'مقبول' },
  { sender: 'لينا حنا', receiver: 'أحمد رحيم', skill: 'الإنجليزية مقابل الجيتار', status: 'مرفوض' },
  { sender: 'ماجي الحوراني', receiver: 'سارة الأحمد', skill: 'إحصاء مقابل تصميم', status: 'معلق' },
  { sender: 'يارا شحاتة', receiver: 'نور فهد', skill: 'كتابة مقابل بيانات', status: 'مقبول' },
  { sender: 'تيسير حداد', receiver: 'فارس ناصر', skill: 'شبكات مقابل مونتاج', status: 'معلق' }
]);
const adminActivity = store.read('adminActivity', [
  { text: 'تمت إضافة مهارة جديدة: React', time: 'منذ 12 دقيقة' },
  { text: 'قبول طلب تبادل بين نور ويوسف', time: 'منذ ساعة' },
  { text: 'تم تعطيل حساب يوسف مؤقتاً', time: 'أمس' },
  { text: 'تم إرسال تقييم جديد من سارة', time: 'أمس' },
  { text: 'انضم 4 طلاب جدد هذا الأسبوع', time: 'قبل يومين' },
  { text: 'اكتمل تبادل بين لينا وأحمد', time: 'قبل 3 أيام' }
]);

function renderAdminSkills() {
  const table = document.getElementById('adminSkillTable');
  if (!table) return;
  table.innerHTML = adminSkills.map((skill, index) => `<tr><td>${skill.name}</td><td>${skill.category}</td><td>${skill.students}</td><td><span class="status-pill ${skill.status === 'موقوف' ? 'pending' : ''}">${skill.status}</span></td><td><button type="button" data-admin-skill="${index}">${skill.status === 'موقوف' ? 'تفعيل' : 'تعطيل'}</button></td></tr>`).join('');
}
function renderAdminRequests() {
  const table = document.getElementById('adminRequestTable');
  if (!table) return;
  table.innerHTML = adminRequests.map((request, index) => `<tr><td>${request.sender}</td><td>${request.receiver}</td><td>${request.skill}</td><td><span class="status-pill ${request.status === 'معلق' ? 'pending' : request.status === 'مرفوض' ? 'pending' : 'completed'}">${request.status}</span></td><td><button type="button" data-admin-request="${index}">${request.status === 'معلق' ? 'قبول' : 'عرض'}</button></td></tr>`).join('');
}
function renderAdminActivity() {
  const list = document.getElementById('adminActivityList');
  if (!list) return;
  list.innerHTML = adminActivity.map((item) => `<div><span class="activity-dot purple">✓</span><p><strong>${item.text}</strong><small>${item.time}</small></p></div>`).join('');
}
renderAdminSkills();
renderAdminRequests();
renderAdminActivity();

async function loadDatabaseSkills() {
  try {
    const response = await fetch('/api/skills', { credentials: 'include' });
    if (!response.ok) return;
    const skills = await response.json();
    adminSkills.splice(0, adminSkills.length, ...skills.map((skill) => ({
      id: skill.id,
      name: skill.skillName,
      category: skill.category,
      students: 0,
      status: skill.isActive ? 'نشط' : 'موقوف'
    })));
    renderAdminSkills();
  } catch {
    // Keep sample admin skills if the API is unavailable.
  }
}
loadDatabaseSkills();

document.querySelectorAll('[data-admin-tab]').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  const view = tab.dataset.adminTab;
  const titles = { users: 'إدارة المستخدمين', skills: 'إدارة المهارات', requests: 'إدارة طلبات التبادل', activity: 'سجل نشاط المنصة' };
  document.getElementById('adminTableTitle').textContent = titles[view];
  document.getElementById('adminUsersPanel').hidden = view !== 'users';
  document.getElementById('adminSkillsPanel').hidden = view !== 'skills';
  document.getElementById('adminRequestsPanel').hidden = view !== 'requests';
  document.getElementById('adminActivityPanel').hidden = view !== 'activity';
}));

document.getElementById('adminSkillForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('adminSkillName').value.trim();
  const category = document.getElementById('adminSkillCategory').value;
  if (!name) return;
  fetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ skillName: name, category, isActive: true })
  })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'تعذر إضافة المهارة');
      return body;
    })
    .then(() => {
      adminSkills.unshift({ id: undefined, name, category, students: 0, status: 'نشط' });
      adminActivity.unshift({ text: `تمت إضافة مهارة جديدة: ${name}`, time: 'الآن' });
      store.write('adminSkills', adminSkills);
      store.write('adminActivity', adminActivity);
      renderAdminSkills();
      renderAdminActivity();
      event.target.reset();
      showToast('تمت إضافة المهارة وحفظها في قاعدة البيانات');
    })
    .catch((error) => showToast(error.message));
});
document.getElementById('adminSkillTable')?.addEventListener('click', (event) => {
  const index = Number(event.target.dataset.adminSkill);
  if (event.target.dataset.adminSkill === undefined) return;
  const isActive = adminSkills[index].status === 'موقوف';
  const request = adminSkills[index].id
    ? fetch(`/api/skills/${adminSkills[index].id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive })
      })
    : Promise.resolve({ ok: true });
  request
    .then((response) => {
      if (!response.ok) throw new Error('تعذر تحديث حالة المهارة');
      adminSkills[index].status = isActive ? 'نشط' : 'موقوف';
      store.write('adminSkills', adminSkills);
      renderAdminSkills();
      showToast(`تم تحديث حالة مهارة ${adminSkills[index].name}`);
    })
    .catch((error) => showToast(error.message));
});
document.getElementById('adminRequestTable')?.addEventListener('click', (event) => {
  const index = Number(event.target.dataset.adminRequest);
  if (event.target.dataset.adminRequest === undefined) return;
  if (adminRequests[index].status === 'معلق') {
    adminRequests[index].status = 'مقبول';
    adminActivity.unshift({ text: `تم قبول طلب تبادل للمهارة ${adminRequests[index].skill}`, time: 'الآن' });
    store.write('adminRequests', adminRequests);
    store.write('adminActivity', adminActivity);
    renderAdminRequests();
    renderAdminActivity();
    showToast('تم قبول طلب التبادل');
  }
});

document.getElementById('exportBtn')?.addEventListener('click', () => {
  const rows = [['المستخدم', 'التخصص', 'الحالة', 'التبادلات'], ...adminUsers.map((user) => [user.name, user.major, user.status, user.exchanges])];
  const csv = '\ufeff' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'skillora-users.csv';
  link.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير تقرير المستخدمين');
});

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// Back to top button
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 600);
}, { passive: true });
backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Nav scrollspy — highlights the section currently in view
const scrollSpySections = ['home', 'how', 'skills', 'students', 'sessions', 'stories', 'faq'];
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
const scrollSpyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navAnchors.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
scrollSpySections.forEach((id) => {
  const section = document.getElementById(id);
  if (section) scrollSpyObserver.observe(section);
});
