const noteInput = document.getElementById('noteInput');
const btnSummarize = document.getElementById('btnSummarize');
const btnFlashcards = document.getElementById('btnFlashcards');
const btnQuestions = document.getElementById('btnQuestions');

const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultSection = document.getElementById('resultSection');
const resultTitle = document.getElementById('resultTitle');
const resultContent = document.getElementById('resultContent');

async function sendRequest(endpoint, message) {
    const noteText = noteInput.value.trim();

    if (!noteText) {
        alert("Lütfen önce bir ders notu yapıştırın!");
        return;
    }

    loadingText.innerText = message;
    loading.classList.remove('hidden');
    resultSection.classList.add('hidden');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteText })
        });

        const data = await response.json();

        if (data.success) {
            resultSection.classList.remove('hidden');
            return data;
        } else {
            alert("Hata: " + data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Sunucuyla bağlantı kurulamadı!");
    } finally {
        loading.classList.add('hidden');
    }
}

btnSummarize.addEventListener('click', async () => {
    const data = await sendRequest('/api/summarize', 'Yapay zekâ ders notunu özetliyor...');
    if (data) {
        resultTitle.innerText = "📝 Ders Notu Özeti";
        resultContent.innerHTML = `<div class="summary-text">${data.summary.replace(/\n/g, '<br>')}</div>`;
    }
});

btnFlashcards.addEventListener('click', async () => {
    const data = await sendRequest('/api/flashcards', 'Çalışma kartları (Flashcards) hazırlanıyor...');
    if (data) {
        resultTitle.innerText = "🎴 Çalışma Kartları (Cevabı görmek için karta tıkla)";
        
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
    const data = await sendRequest('/api/questions', 'Test soruları oluşturuluyor...');
    if (data) {
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