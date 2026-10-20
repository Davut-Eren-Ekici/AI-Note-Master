const BACKEND_URL = 'https://ai-note-master.onrender.com';

const noteInput = document.getElementById('noteInput');
const btnSummarize = document.getElementById('btnSummarize');
const btnFlashcards = document.getElementById('btnFlashcards');
const btnQuestions = document.getElementById('btnQuestions');

const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultSection = document.getElementById('resultSection');
const resultTitle = document.getElementById('resultTitle');
const resultContent = document.getElementById('resultContent');

// Tüm aksiyon butonlarını kilitleme/açma fonksiyonu (Çoklu tıklama koruması)
function setButtonsDisabled(status) {
    btnSummarize.disabled = status;
    btnFlashcards.disabled = status;
    btnQuestions.disabled = status;
}

// Akıllı fetch ve otomatik tekrar deneme (Retry) mekanizması
async function fetchWithRetry(url, options, retries = 2, delay = 3000) {
    try {
        const response = await fetch(url, options);

        // Eğer sunucu 503 veya 502 veriyorsa (Render uyku modu vb.) tekrar dene
        if ((response.status === 503 || response.status === 502) && retries > 0) {
            console.warn(`Sunucu uyanıyor... ${delay / 1000} saniye sonra tekrar deneniyor...`);
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(url, options, retries - 1, delay);
        }

        return response;
    } catch (err) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return fetchWithRetry(url, options, retries - 1, delay);
        }
        throw err;
    }
}

async function sendRequest(endpoint, message) {
    const noteText = noteInput.value.trim();

    if (!noteText) {
        alert("Lütfen önce bir ders notu girin.");
        return null;
    }

    // İstek başladı: Butonları kilitle ve yükleniyor ekranını göster
    setButtonsDisabled(true);
    loadingText.innerText = message;
    loading.classList.remove('hidden');
    resultSection.classList.add('hidden');

    try {
        const response = await fetchWithRetry(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteText })
        });

        const data = await response.json();

        if (data.success) {
            resultSection.classList.remove('hidden');
            return data;
        } else {
            alert("Hata: " + (data.error || "Bilinmeyen bir hata oluştu."));
            return null;
        }
    } catch (err) {
        console.error(err);
        alert("Sunucuyla bağlantı kurulamadı. Sunucu uyanıyor olabilir, lütfen birkaç saniye sonra tekrar deneyin.");
        return null;
    } finally {
        // İstek bitti: Yüklenmeyi kapat ve butonları tekrar aç
        loading.classList.add('hidden');
        setButtonsDisabled(false);
    }
}

btnSummarize.addEventListener('click', async () => {
    const data = await sendRequest('/api/summarize', 'Ders notu özetleniyor...');
    if (data && data.summary) {
        resultTitle.innerText = "📝 Ders Notu Özeti";
        resultContent.innerHTML = `
            <div class="summary-container">
                ${data.summary.replace(/\n/g, '<br>')}
            </div>
        `;
    }
});

btnFlashcards.addEventListener('click', async () => {
    const data = await sendRequest('/api/flashcards', 'Çalışma kartları hazırlanıyor...');
    if (data && data.flashcards) {
        resultTitle.innerText = "🎴 Çalışma Kartları (Çevirmek için tıklayın)";

        let cardsHTML = '<div class="flashcard-grid">';
        data.flashcards.forEach(card => {
            cardsHTML += `
                <div class="flashcard-container" onclick="this.classList.toggle('flipped')">
                    <div class="flashcard-inner">
                        <div class="flashcard-front">${card.front}</div>
                        <div class="flashcard-back">${card.back}</div>
                    </div>
                </div>
            `;
        });
        cardsHTML += '</div>';
        resultContent.innerHTML = cardsHTML;
    }
});

btnQuestions.addEventListener('click', async () => {
    const data = await sendRequest('/api/questions', 'Test soruları hazırlanıyor...');
    if (data && data.questions) {
        resultTitle.innerText = "❓ Soru Bankası";

        let questionsHTML = '<div class="questions-list">';
        data.questions.forEach((q, index) => {
            questionsHTML += `
                <div class="question-card">
                    <h3>${index + 1}. ${q.question}</h3>
                    <div class="options">
                        ${q.options.map(opt => `<button class="opt-btn" onclick="checkAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.answer.replace(/'/g, "\\'")}')">${opt}</button>`).join('')}
                    </div>
                </div>
            `;
        });
        questionsHTML += '</div>';
        resultContent.innerHTML = questionsHTML;
    }
});

function checkAnswer(btn, selected, correct) {
    const parent = btn.parentElement;
    const buttons = parent.querySelectorAll('.opt-btn');
    buttons.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
    } else {
        btn.classList.add('incorrect');
        buttons.forEach(b => {
            if (b.innerText === correct) b.classList.add('correct');
        });
    }
}