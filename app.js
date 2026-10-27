// Скрипт підключено з атрибутом defer: він виконується після побудови DOM-дерева.

const form = document.querySelector('#reviewForm');
const nameInput = document.querySelector('#name');
const textInput = document.querySelector('#text');
const charCount = document.querySelector('#charCount');
const counterBox = document.querySelector('.counter');
const reviewList = document.querySelector('#reviewList');
const reviewCount = document.querySelector('#reviewCount');
const emptyMsg = document.querySelector('#emptyMsg');
const noResults = document.querySelector('#noResults');
const clearBtn = document.querySelector('#clearBtn');
const themeBtn = document.querySelector('#themeBtn');
const toTop = document.querySelector('#toTop');
const searchInput = document.querySelector('#search');
const likeBtn = document.querySelector('#likeBtn');
const likeCount = document.querySelector('#likeCount');

const MAX_LEN = 300;
const KEYS = { theme: 'ui-theme', reviews: 'ui-reviews', likes: 'ui-likes' };

/* ================= localStorage (BOM) ================= */
// Обгортки з try/catch: сховище може бути недоступним (приватний режим, заборона cookies).
function save(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { console.warn('localStorage недоступний', e); }
}
function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

let reviews = [];            // масив об'єктів {id, name, text, time}; зберігається як JSON
let likes = 0;

function saveReviews() {
  save(KEYS.reviews, JSON.stringify(reviews));
}
function loadReviews() {
  try {
    const parsed = JSON.parse(load(KEYS.reviews));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];               // пошкоджений JSON не ламає сторінку
  }
}

/* ================= Тема ================= */
function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeBtn.textContent = isDark ? 'Світла тема' : 'Темна тема';
}
themeBtn.addEventListener('click', () => {
  const theme = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(theme);
  save(KEYS.theme, theme);
});

/* ================= Лічильник вподобань ================= */
function renderLikes() {
  likeCount.textContent = likes;
  likeBtn.classList.toggle('liked', likes > 0);
}
likeBtn.addEventListener('click', () => {
  likes += 1;
  renderLikes();
  save(KEYS.likes, String(likes));
  likeBtn.classList.add('pop');
  setTimeout(() => likeBtn.classList.remove('pop'), 150);
});

/* ================= Відгуки ================= */
function updateCount() {
  reviewCount.textContent = reviews.length;
  emptyMsg.classList.toggle('hidden', reviews.length > 0);
  clearBtn.classList.toggle('hidden', reviews.length === 0);
}

function createReviewNode(review) {
  const li = document.createElement('li');
  li.className = 'review';
  li.dataset.id = review.id;
  li.innerHTML = '<header><strong></strong><time></time></header><p></p>' +
                 '<button type="button" class="del">Видалити</button>';
  // textContent: введений текст не інтерпретується як HTML (захист від XSS)
  li.querySelector('strong').textContent = review.name;
  li.querySelector('time').textContent = review.time;
  li.querySelector('p').textContent = review.text;
  return li;
}

function renderAll() {
  reviewList.innerHTML = '';
  reviews.forEach((r) => reviewList.append(createReviewNode(r)));   // reviews[0] — найновіший
  updateCount();
  filterReviews();
}

/* ---------- Валідація ---------- */
function showError(field, message) {
  document.querySelector(`[data-error-for="${field.name}"]`).textContent = message;
  field.classList.toggle('invalid', message !== '');
}
function validate() {
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  let ok = true;
  if (name.length < 2) { showError(nameInput, 'Введіть ім’я (мінімум 2 символи).'); ok = false; }
  else showError(nameInput, '');
  if (text.length < 10) { showError(textInput, 'Відгук має містити щонайменше 10 символів.'); ok = false; }
  else showError(textInput, '');
  return ok;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validate()) return;

  const review = {
    id: Date.now(),
    name: nameInput.value.trim(),
    text: textInput.value.trim(),
    time: new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })
  };
  reviews.unshift(review);
  saveReviews();
  reviewList.prepend(createReviewNode(review));
  updateCount();
  filterReviews();

  form.reset();
  charCount.textContent = '0';
  counterBox.classList.remove('warn');
  nameInput.focus();
});

textInput.addEventListener('input', () => {
  const len = textInput.value.length;
  charCount.textContent = len;
  counterBox.classList.toggle('warn', len > MAX_LEN - 30);
  if (len >= 10) showError(textInput, '');
});
nameInput.addEventListener('input', () => {
  if (nameInput.value.trim().length >= 2) showError(nameInput, '');
});
nameInput.addEventListener('blur', () => {
  if (nameInput.value.trim().length < 2) showError(nameInput, 'Введіть ім’я (мінімум 2 символи).');
});
textInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    form.requestSubmit();
  }
});

/* ================= Делегування подій + анімація видалення ================= */
// ОДИН слухач на батьківському контейнері <ul>. Клік по кнопці всередині картки
// «спливає» (bubbling) до <ul>, а event.target показує, по чому саме клікнули.
reviewList.addEventListener('click', (event) => {
  const btn = event.target.closest('.del');
  if (!btn) return;                                   // клік не по кнопці видалення

  const item = btn.closest('.review');
  if (item.classList.contains('removing')) return;    // захист від повторного кліку

  // Після завершення CSS-переходу прибираємо вузол з DOM та зі сховища.
  item.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'opacity') return;         // подія приходить для кожної властивості
    item.remove();                                    // node.remove()
    reviews = reviews.filter((r) => String(r.id) !== item.dataset.id);
    saveReviews();
    updateCount();
    filterReviews();
  });
  item.classList.add('removing');                     // запускає CSS-перехід
});

clearBtn.addEventListener('click', () => {
  if (window.confirm('Видалити всі відгуки?')) {
    reviews = [];
    saveReviews();
    renderAll();
    window.alert('Список відгуків очищено.');
  }
});

/* ================= Жива фільтрація ================= */
function filterReviews() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;
  reviewList.querySelectorAll('.review').forEach((item) => {
    const match = item.textContent.toLowerCase().includes(query);
    item.classList.toggle('hidden', !match);
    if (match) visible += 1;
  });
  noResults.classList.toggle('hidden', !(reviews.length > 0 && visible === 0));
}
searchInput.addEventListener('input', filterReviews);   // кожна введена літера

/* ================= Прокручування ================= */
window.addEventListener('scroll', () => {
  toTop.classList.toggle('hidden', window.scrollY < 300);
});
toTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ================= Початковий стан зі сховища ================= */
applyTheme(load(KEYS.theme) || 'light');
reviews = loadReviews();
likes = parseInt(load(KEYS.likes), 10) || 0;
renderLikes();
renderAll();
