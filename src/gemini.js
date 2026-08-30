import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // فقط درخواست‌های POST پذیرفته می‌شوند
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'کلید API در ورسل تنظیم نشده است.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { prompt } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ text: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || 'خطا در برقراری ارتباط با هوش مصنوعی' });
  }
}

