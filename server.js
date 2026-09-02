import express from `express`;
import cors from `cors`;
import dotenv from `dotenv`;
import { GoogleGenAI } from "@google/genai";

dotenv.cofing();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


app.post('/api/summarize', async (req , res) => {
    try{
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen Bir Ders Notu Girin"});
        const prompt =`Aşağıdaki ders notunu analiz et. Önemli noktaları anlaşılır, düzenli ve maddeler halinde Türkçe olarak özetle:\n\n${noteText}`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        res.json({ success: true, summary: response.text });
        } catch (error) {
        console.error("Özet hatası:", error);
        res.status(500).json({ success: false, error: "Özet oluşturulurken bir hata oluştu." });
    }
    
});

//FLASHCARD
app.post('/api/flashcards', async (req, res) => {
    try {
        const { noteText } = req.body;
        if (!noteText) return res.status(400).json({ error: "Lütfen bir ders notu girin." });

        const prompt = `Aşağıdaki ders notundan çalışma kartları (flashcard) oluştur. 
        Yanıtı SADECE aşağıdaki JSON formatında ver, başka hiçbir açıklama yazma:
        [
          {"front": "Kavram/Soru", "back": "Açıklama/Cevap"}
        ]
        
        Ders Notu:
        ${noteText}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const flashcards = JSON.parse(response.text);
        res.json({ success: true, flashcards });
    } catch (error) {
        console.error("Flashcard hatası:", error);
        res.status(500).json({ success: false, error: "Flashcard oluşturulamadı." });
    }
});

//Soru Bankası ENDPOINT'İ
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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const questions = JSON.parse(response.text);
        res.json({ success: true, questions });
    } catch (error) {
        console.error("Soru üretme hatası:", error);
        res.status(500).json({ success: false, error: "Sorular üretilemedi." });
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda başarıyla çalışıyor: http://localhost:${PORT}`);
});