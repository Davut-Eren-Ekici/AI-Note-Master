const BACKEND_URL = 'https://ai-note-master.onrender.com';

const MAX_NOTE_LENGTH = 20000;       // server.js ile aynı olmalı
const REQUEST_TIMEOUT_MS = 60000;    // tek bir denemenin üst süresi
const RETRY_STATUSES = [502, 503, 504];

const noteInput = document.getElementById('noteInput');
const btnSummarize = document.getElementById('btnSummarize');
const btnFlashcards = document.getElementById('btnFlashcards');
const btnQuestions = document.getElementById('btnQuestions');

const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultSection = document.getElementById('resultSection');
const resultTitle = document.getElementById('resultTitle');
const resultContent = document.getElementById('resultContent');

/* ---------- Yardımcılar ---------- */

// AI çıktısını innerHTML'e basmadan önce HTML'den arındırır
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Basit ve güvenli markdown çevirici: başlık, **kalın**, "- " listeleri
function renderSummary(text) {
    const inline = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let html = '';
    let inList = false;

    for (const rawLine of escapeHtml(text).split('\n')) {
        const line = rawLine.trim();
        const item = line.match(/^[-*•]\s+(.*)$/);

        if (item) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${inline(item[1])}</li>`;
            continue;
        }

        if (inList) { html += '</ul>'; inList = false; }
        if (!line) continue;

        const heading = line.match(/^#{1,6}\s+(.*)$/);
        html += heading
            ? `<p><strong>${inline(heading[1])}</strong></p>`
            : `<p>${inline(line)}</p>`;
    }

    if (inList) html += '</ul>';
    return html;
}

function setButtonsDisabled(status) {
    btnSummarize.disabled = status;
    btnFlashcards.disabled = status;
    btnQuestions.disabled = status;
}

// Sonucu ekrana yalnızca veri doğrulandıktan ve hazırlandıktan sonra basar
function showResult(title, html) {
    resultTitle.textContent = title;
    resultContent.innerHTML = html;
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Ağ katmanı ---------- */

// Zaman aşımlı fetch + Render uyku modu için tekrar deneme
async function fetchWithRetry(url, options, retries = 5, delay = 5000) {
    for (let attempt = 0; ; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });

            if (RETRY_STATUSES.includes(response.status) && attempt < retries) {
                console.warn(`Sunucu uyanıyor... ${delay / 1000} sn sonra tekrar deneniyor (${attempt + 1}/${retries})`);
                await sleep(delay);
                continue;
            }
            return response;
        } catch (err) {
            if (attempt >= retries) throw err;
            await sleep(delay);
        } finally {
            clearTimeout(timer);
        }
    }
}

async function sendRequest(endpoint, message) {
    const noteText = noteInput.value.trim();

    if (!noteText) {
        alert('Lütfen önce bir ders notu girin.');
        return null;
    }
    if (noteText.length > MAX_NOTE_LENGTH) {
        alert(`Not çok uzun (${noteText.length} karakter). En fazla ${MAX_NOTE_LENGTH} karakter girebilirsiniz.`);
        return null;
    }

    setButtonsDisabled(true);
    loadingText.textContent = message;
    loading.classList.remove('hidden');
    resultSection.classList.add('hidden');

    // Ücretsiz sunucu uyuyorsa kullanıcı neden beklediğini bilsin
    const slowTimer = setTimeout(() => {
        loadingText.textContent = 'Sunucu uyanıyor, bu işlem 1 dakikaya kadar sürebilir...';
    }, 8000);

    try {
        const response = await fetchWithRetry(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteText })
        });

        // Sunucu JSON yerine HTML hata sayfası döndürürse çökmesin
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (response.ok && data && data.success) return data;

        alert('Hata: ' + (data?.error || `Sunucu hatası (${response.status}). Lütfen tekrar deneyin.`));
        return null;
    } catch (err) {
        console.error(err);
        alert('Sunucuyla bağlantı kurulamadı. Sunucu uyanıyor olabilir, lütfen birkaç saniye sonra tekrar deneyin.');
        return null;
    } finally {
        clearTimeout(slowTimer);
        loading.classList.add('hidden');
        setButtonsDisabled(false);
    }
}

function unexpectedResponse() {
    alert('Sunucudan beklenmeyen bir yanıt geldi. Lütfen tekrar deneyin.');
}

/* ---------- Butonlar ---------- */

btnSummarize.addEventListener('click', async () => {
    const data = await sendRequest('/api/summarize', 'Ders notu özetleniyor...');
    if (!data) return;

    if (typeof data.summary !== 'string' || !data.summary.trim()) return unexpectedResponse();

    showResult(
        '📝 Ders Notu Özeti',
        `<div class="summary-container">${renderSummary(data.summary)}</div>`
    );
});

btnFlashcards.addEventListener('click', async () => {
    const data = await sendRequest('/api/flashcards', 'Çalışma kartları hazırlanıyor...');
    if (!data) return;

    if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) return unexpectedResponse();

    const cards = data.flashcards
        .filter(card => card && card.front && card.back)
        .map(card => `
            <div class="flashcard-container" tabindex="0" role="button" aria-label="Kartı çevir">
                <div class="flashcard-inner">
                    <div class="flashcard-front">${escapeHtml(card.front)}</div>
                    <div class="flashcard-back">${escapeHtml(card.back)}</div>
                </div>
            </div>
        `)
        .join('');

    if (!cards) return unexpectedResponse();

    showResult(
        '🎴 Çalışma Kartları (Çevirmek için tıklayın)',
        `<div class="flashcard-grid">${cards}</div>`
    );
});

btnQuestions.addEventListener('click', async () => {
    const data = await sendRequest('/api/questions', 'Test soruları hazırlanıyor...');
    if (!data) return;

    if (!Array.isArray(data.questions) || data.questions.length === 0) return unexpectedResponse();

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    const questions = data.questions
        .filter(q =>
            q && q.question && Array.isArray(q.options) &&
            Number.isInteger(q.answerIndex) &&
            q.answerIndex >= 0 && q.answerIndex < q.options.length
        )
        .map((q, index) => `
            <div class="question-card">
                <h3>${index + 1}. ${escapeHtml(q.question)}</h3>
                <div class="options">
                    ${q.options.map((opt, i) => `
                        <button type="button" class="opt-btn" data-index="${i}" data-correct="${q.answerIndex}">
                            ${letters[i] || i + 1}) ${escapeHtml(opt)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `)
        .join('');

    if (!questions) return unexpectedResponse();

    showResult('❓ Soru Bankası', `<div class="questions-list">${questions}</div>`);
});

/* ---------- Sonuç alanı etkileşimleri (event delegation) ---------- */

function flipCard(card) {
    card.classList.toggle('flipped');
}

function handleAnswer(btn) {
    const buttons = btn.parentElement.querySelectorAll('.opt-btn');
    const correct = Number(btn.dataset.correct);

    buttons.forEach(b => { b.disabled = true; });
    buttons[correct].classList.add('correct');

    if (Number(btn.dataset.index) !== correct) {
        btn.classList.add('incorrect');
    }
}

resultContent.addEventListener('click', (e) => {
    const card = e.target.closest('.flashcard-container');
    if (card) {
        flipCard(card);
        return;
    }

    const btn = e.target.closest('.opt-btn');
    if (btn && !btn.disabled) handleAnswer(btn);
});

// Klavye erişilebilirliği: kartlar Enter / Boşluk ile çevrilebilsin
resultContent.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const card = e.target.closest('.flashcard-container');
    if (card) {
        e.preventDefault();
        flipCard(card);
    }
});