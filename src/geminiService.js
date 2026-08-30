import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6Idl7rnC68B0x1BxWRGVAidYsNtWj07MW5FPAdqOhpnKA" });

export async function callGemini(type, userData, images, fridgeItems) {
  try {
    if (type === "workout") {
      const { height, weight, goal, days, equipment } = userData;
      let prompt = `یک مربی ورزشی حرفه‌ای هستی. برای کاربری با مشخصات زیر یک برنامه تمرینی اختصاصی و دقیق به زبان فارسی در قالب JSON معتبر طراحی کن.
اطلاعات کاربر:
- قد: ${height} سانتی‌متر
- وزن: ${weight} کیلوگرم
- هدف: ${goal}
- تعداد روزهای تمرین در هفته: ${days} روز
- امکانات و تجهیزات ورزشی در دسترس: ${equipment || "وزن بدن"}

خروجی باید صرفاً یک آبجکت JSON معتبر (بدون تگ مارک‌داون) با این ساختار باشد:
{
  "summary": "تحلیل کوتاه",
  "plan": [
    {
      "day": "روز اول",
      "exercises": [
        { "name": "نام حرکت", "sets": 3, "reps": "10-12", "tips": "نکته" }
      ]
    }
  ]
}`;

      const contents = [];
      if (images && images.length > 0) {
        images.forEach((img) => {
          contents.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
        });
      }
      contents.push(prompt);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const cleanedJson = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanedJson);

    } else if (type === "diet") {
      let prompt = `یک متخصص تغذیه هستی. با مواد زیر یک غذا پیشنهاد بده به زبان فارسی در قالب JSON معتبر:
مواد موجود: ${fridgeItems}

خروجی دقیقاً یک آبجکت JSON (بدون مارک‌داون):
{
  "recipeName": "نام غذا",
  "calories": "تقریبی",
  "ingredients": ["مورد 1"],
  "instructions": ["مرحله 1"],
  "macros": "پروتئین...",
  "whyGood": "دلیل مناسب بودن"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const cleanedJson = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanedJson);
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

