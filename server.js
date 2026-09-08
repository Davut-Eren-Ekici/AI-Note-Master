import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

console.log("Yüklenen API Key:", process.env.GEMINI_API_KEY ? "Mevcut (Key Okundu)" : "EKSİK / TANIMSIZ!");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Gemini istemcisi başlatılıyor
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 1. ÖZET ÇIKARMA ENDPOINT'İ
app.post('/api/summarize', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Aşağıdaki ders notunu analiz et. Önemli noktaları anlaşılır, düzenli ve maddeler halinde Türkçe olarak özetle:\n\n${noteText}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const outputText = response.text();

        res.json({ success: true, summary: outputText });
    } catch (error) {
        console.error("Özet hatası detayı:", error);
        res.status(500).json({ success: false, error: error.message || "Özet oluşturulurken bir hata oluştu." });
    }
});

// 2. FLASHCARD ENDPOINT'İ
app.post('/api/flashcards', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Aşağıdaki ders notundan çalışma kartları (flashcard) oluştur. 
        Yanıtı SADECE aşağıdaki JSON formatında ver:
        [
          {"front": "Kavram/Soru", "back": "Açıklama/Cevap"}
        ]
        
        Ders Notu:
        ${noteText}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const flashcards = JSON.parse(response.text());

        res.json({ success: true, flashcards });
    } catch (error) {
        console.error("Flashcard hatası detayı:", error);
        res.status(500).json({ success: false, error: error.message || "Flashcard oluşturulamadı." });
    }
});

// 3. SORU BANKASI ENDPOINT'İ
app.post('/api/questions', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const questions = JSON.parse(response.text());

        res.json({ success: true, questions });
    } catch (error) {
        console.error("Soru üretme hatası detayı:", error);
        res.status(500).json({ success: false, error: error.message || "Sorular üretilemedi." });
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda başarıyla çalışıyor: http://localhost:${PORT}`);
});