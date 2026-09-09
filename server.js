import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Güvenli içerik üretici (503 yoğunluk hatasında otomatik tekrar dener)
async function generateWithFallback(prompt, isJson = false) {
    const config = isJson ? { responseMimeType: "application/json" } : undefined;
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash', generationConfig: config });
        const result = await model.generateContent(prompt);
        return await result.response;
    } catch (error) {
        // Eğer 503 (Servis Yoğun) hatası alınırsa 1 saniye bekleyip tekrar dene
        if (error.message && error.message.includes('503')) {
            console.warn("Model yoğun, 1 saniye sonra tekrar deneniyor...");
            await new Promise(res => setTimeout(res, 1000));
            const retryModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash', generationConfig: config });
            const result = await retryModel.generateContent(prompt);
            return await result.response;
        }
        throw error;
    }
}

// 1. ÖZET ÇIKARMA ENDPOINT'İ
app.post('/api/summarize', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const prompt = `Aşağıdaki ders notunu analiz et. Önemli noktaları anlaşılır, düzenli ve maddeler halinde Türkçe olarak özetle:\n\n${noteText}`;
        const response = await generateWithFallback(prompt, false);

        res.json({ success: true, summary: response.text() });
    } catch (error) {
        console.error("Özet hatası detayı:", error);
        res.status(500).json({ success: false, error: "Servis şu an çok yoğun. Lütfen birkaç saniye sonra tekrar deneyin." });
    }
});

// 2. FLASHCARD ENDPOINT'İ
app.post('/api/flashcards', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const prompt = `Aşağıdaki ders notundan çalışma kartları (flashcard) oluştur. 
        Yanıtı SADECE aşağıdaki JSON formatında ver:
        [
          {"front": "Kavram/Soru", "back": "Açıklama/Cevap"}
        ]
        
        Ders Notu:
        ${noteText}`;

        const response = await generateWithFallback(prompt, true);
        const flashcards = JSON.parse(response.text());

        res.json({ success: true, flashcards });
    } catch (error) {
        console.error("Flashcard hatası detayı:", error);
        res.status(500).json({ success: false, error: "Servis şu an çok yoğun. Lütfen birkaç saniye sonra tekrar deneyin." });
    }
});

// 3. SORU BANKASI ENDPOINT'İ
app.post('/api/questions', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const prompt = `Aşağıdaki ders notuna dayanarak 3 adet çoktan seçmeli soru hazırla.
        Yanıtı SADECE şu JSON formatında ver:
        [
          {
            "question": "Soru metni",
            "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
            "answer": "Doğru şıkkın birebir metni"
          }
        ]
        
        Ders Notu:
        ${noteText}`;

        const response = await generateWithFallback(prompt, true);
        const questions = JSON.parse(response.text());

        res.json({ success: true, questions });
    } catch (error) {
        console.error("Soru üretme hatası detayı:", error);
        res.status(500).json({ success: false, error: "Servis şu an çok yoğun. Lütfen birkaç saniye sonra tekrar deneyin." });
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda başarıyla çalışıyor.`);
});