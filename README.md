# 🚀 AI-Note-Master (QuizCraft AI)

> Yapay zekâ destekli, dinamik ve kişiselleştirilebilir interaktif test/sınav hazırlama platformu.

![Project Banner](https://img.shields.io/badge/Status-Active-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

🌐 **Canlı Demo / Live Web Application:** [https://davut-eren-ekici.github.io/AI-Note-Master/](https://davut-eren-ekici.github.io/AI-Note-Master/)

---

## 📌 Proje Hakkında (About)

# AI Note Master

Ders notlarını yapıştırın; yapay zekâ sizin için **özet**, **çalışma kartları (flashcard)** ve **çoktan seçmeli test soruları** üretsin.

## Özellikler

- 📝 **Özet çıkarma:** Notu maddeler halinde, önemli terimleri vurgulayarak özetler.
- 🎴 **Flashcard üretimi:** Tıklayınca (veya klavyede Enter/Boşluk ile) çevrilen çalışma kartları.
- ❓ **Soru bankası:** 3 çoktan seçmeli soru; seçimden sonra anında doğru/yanlış geri bildirimi.
- 🛡️ **Dayanıklı altyapı:** Sunucu uyku modundan uyanırken otomatik tekrar deneme, zaman aşımı, giriş doğrulaması ve rate limit.
- 📱 **Responsive** tasarım (CSS Grid / Flexbox, glassmorphism).

## Teknolojiler

**Frontend:** HTML5, CSS3 (Custom Properties, Flexbox, Grid), Vanilla JavaScript (ES6+, async/await)

**Backend:** Node.js, Express.js, Google Gemini API (`@google/generative-ai`) — Render üzerinde barındırılır.

## Kurulum

```bash
npm install
```

Proje köküne bir `.env` dosyası oluşturun (**bu dosyayı asla GitHub'a yüklemeyin**, `.gitignore`'a ekleyin):

```env
GEMINI_API_KEY=buraya_api_anahtariniz
# İsteğe bağlı
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGIN=https://siteniz.example.com
PORT=8080
```

Sunucuyu başlatın:

```bash
node server.js
```

Frontend için `script.js` içindeki `BACKEND_URL` değerini kendi sunucu adresinizle güncelleyin ve `index.html`'i açın.

## API

| Method | Endpoint | Gövde | Dönüş |
|--------|----------|-------|-------|
| POST | `/api/summarize` | `{ "noteText": "..." }` | `{ success, summary }` |
| POST | `/api/flashcards` | `{ "noteText": "..." }` | `{ success, flashcards: [{front, back}] }` |
| POST | `/api/questions` | `{ "noteText": "..." }` | `{ success, questions: [{question, options, answerIndex}] }` |
| GET | `/health` | — | `{ ok: true }` |

Sınırlar: not başına en fazla 20.000 karakter, IP başına dakikada 10 istek.

## İletişim

Davut Eren Ekici — [GitHub](https://github.com/Davut-Eren-Ekici)