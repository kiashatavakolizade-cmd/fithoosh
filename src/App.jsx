import React, { useState } from "react";
import {
  Camera,
  Dumbbell,
  Utensils,
  Activity,
  Calendar,
  Target,
  Video,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const MAX_IMAGES = 3;

function resizeImage(file, maxSize = 1280, maxBytes = 900_000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("خواندن تصویر ناموفق بود."));
    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("فرمت تصویر قابل پردازش نیست."));
      img.onload = () => {
        let { width, height } = img;

        if (Math.max(width, height) > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("مرورگر امکان پردازش تصویر را ندارد."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        while (dataUrl.length > maxBytes * 1.37 && quality > 0.45) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        const commaIndex = dataUrl.indexOf(",");
        const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : "";

        resolve({
          preview: dataUrl,
          base64,
          mimeType: "image/jpeg",
        });
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

async function callApi(payload) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result = null;

  try {
    result = await response.json();
  } catch {
    throw new Error("پاسخ نامعتبر از سرور دریافت شد.");
  }

  if (!response.ok) {
    throw new Error(result?.error || "خطا در ارتباط با سرور.");
  }

  return result;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("workout");

  const [userData, setUserData] = useState({
    height: "",
    weight: "",
    goal: "",
    days: "3",
    equipment: "",
  });

  const [images, setImages] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState("");

  const [fridgeItems, setFridgeItems] = useState("");
  const [dietPlan, setDietPlan] = useState(null);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);
  const [dietError, setDietError] = useState("");

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentExerciseQuery, setCurrentExerciseQuery] = useState("");

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      alert("حداکثر ۳ عکس می‌توانید آپلود کنید.");
      event.target.value = "";
      return;
    }

    try {
      const processed = await Promise.all(
        files.map((file) => resizeImage(file))
      );

      setImages((prev) => [...prev, ...processed]);
    } catch (error) {
      console.error(error);
      setWorkoutError("پردازش یکی از عکس‌ها ناموفق بود. لطفاً عکس دیگری امتحان کنید.");
    } finally {
      event.target.value = "";
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const generateWorkout = async () => {
    if (!userData.height || !userData.weight || !userData.goal) {
      setWorkoutError("لطفاً قد، وزن و هدف خود را وارد کنید.");
      return;
    }

    setIsGeneratingWorkout(true);
    setWorkoutError("");
    setWorkoutPlan(null);

    try {
      const data = await callApi({
        type: "workout",
        userData,
        images: images.map(({ base64, mimeType }) => ({ base64, mimeType })),
      });

      setWorkoutPlan(data);
    } catch (error) {
      console.error(error);
      setWorkoutError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت برنامه تمرینی. لطفاً دوباره تلاش کنید."
      );
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  const generateDiet = async () => {
    if (!fridgeItems.trim()) {
      setDietError("لطفاً موجودی یخچال خود را بنویسید.");
      return;
    }

    setIsGeneratingDiet(true);
    setDietError("");
    setDietPlan(null);

    try {
      const data = await callApi({
        type: "diet",
        userData,
        fridgeItems: fridgeItems.trim(),
      });

      setDietPlan(data);
    } catch (error) {
      console.error(error);
      setDietError(
        error instanceof Error
          ? error.message
          : "خطا در دریافت برنامه غذایی. لطفاً دوباره تلاش کنید."
      );
    } finally {
      setIsGeneratingDiet(false);
    }
  };

  const openVideoModal = (exerciseName) => {
    const query = encodeURIComponent(`آموزش حرکت ${exerciseName}`);
    setCurrentExerciseQuery(query);
    setVideoModalOpen(true);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 font-sans text-slate-800 relative"
    >
      <header className="bg-emerald-600 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Activity className="w-8 h-8" />
            <h1 className="text-2xl font-bold">فیت‌هوش | مربی هوشمند شما</h1>
          </div>

          <div className="flex bg-emerald-700 rounded-full p-1">
            <button
              type="button"
              onClick={() => setActiveTab("workout")}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === "workout"
                  ? "bg-white text-emerald-700 shadow"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              برنامه تمرینی
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("diet")}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === "diet"
                  ? "bg-white text-emerald-700 shadow"
                  : "text-emerald-100 hover:text-white"
              }`}
            >
              <Utensils className="w-4 h-4" />
              یخچال هوشمند
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === "workout" && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  اطلاعات فیزیکی و اهداف
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  برای دریافت دقیق‌ترین برنامه، فرم زیر را کامل کنید.
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          قد (cm)
                        </label>
                        <input
                          type="number"
                          name="height"
                          min="1"
                          value={userData.height}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="۱۷۵"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          وزن (kg)
                        </label>
                        <input
                          type="number"
                          name="weight"
                          min="1"
                          value={userData.weight}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="۷۰"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        هدف از تمرین
                      </label>
                      <input
                        type="text"
                        name="goal"
                        value={userData.goal}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="مثلاً: افزایش حجم، فیتنس..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        تعداد روز تمرین
                      </label>
                      <select
                        name="days"
                        value={userData.days}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      >
                        <option value="2">۲ روز در هفته</option>
                        <option value="3">۳ روز در هفته</option>
                        <option value="4">۴ روز در هفته</option>
                        <option value="5">۵ روز در هفته</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        امکانات ورزشی
                      </label>
                      <textarea
                        name="equipment"
                        value={userData.equipment}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        placeholder="مثلاً: میله بارفیکس، دمبل یا فقط وزن بدن..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      عکس‌های بدن (اختیاری)
                    </label>

                    <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleImageUpload}
                      />
                      <Camera className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-sm font-medium text-emerald-600">
                        برای انتخاب عکس کلیک کنید
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        حداکثر ۳ عکس
                      </p>
                    </div>

                    {images.length > 0 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {images.map((img, index) => (
                          <div
                            key={`${img.preview}-${index}`}
                            className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                          >
                            <img
                              src={img.preview}
                              alt={`پیش‌نمایش ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              aria-label="حذف تصویر"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {workoutError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                    {workoutError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={generateWorkout}
                  disabled={isGeneratingWorkout}
                  className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGeneratingWorkout ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      دریافت برنامه تمرینی
                    </>
                  )}
                </button>
              </div>
            </div>

            {workoutPlan && (
              <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-5">
                  <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    برنامه تمرینی شما آماده است!
                  </h2>
                </div>

                <div className="p-6">
                  <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-2">
                      تحلیل هوش مصنوعی:
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {workoutPlan.summary}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {(workoutPlan.plan || []).map((dayPlan, idx) => (
                      <div
                        key={`${dayPlan.day}-${idx}`}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-slate-600" />
                          <h3 className="font-bold text-slate-800">
                            {dayPlan.day}
                          </h3>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {(dayPlan.exercises || []).map((ex, exIdx) => (
                            <div
                              key={`${ex.name}-${exIdx}`}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50"
                            >
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-lg">
                                  {ex.name}
                                </h4>

                                <div className="flex gap-4 text-sm text-slate-600 mt-1">
                                  <span className="bg-slate-200 px-2 py-0.5 rounded-md">
                                    {ex.sets} ست
                                  </span>
                                  <span className="bg-slate-200 px-2 py-0.5 rounded-md">
                                    {ex.reps} تکرار
                                  </span>
                                </div>

                                <p className="text-xs text-slate-500 mt-2">
                                  <span className="font-bold text-emerald-600">
                                    نکته:
                                  </span>{" "}
                                  {ex.tips}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => openVideoModal(ex.name)}
                                className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition border border-red-100"
                              >
                                <Video className="w-4 h-4" />
                                ویدیو آموزش
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "diet" && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-orange-500" />
                  یخچال هوشمند
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  مواد غذایی موجود را بنویسید.
                </p>
              </div>

              <div className="p-6">
                <textarea
                  value={fridgeItems}
                  onChange={(e) => setFridgeItems(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  placeholder="مثلاً: ۲ عدد تخم مرغ، اسفناج، گوجه فرنگی..."
                />

                {dietError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {dietError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={generateDiet}
                  disabled={isGeneratingDiet}
                  className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGeneratingDiet ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Utensils className="w-5 h-5" />
                      پیشنهاد غذا
                    </>
                  )}
                </button>
              </div>
            </div>

            {dietPlan && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
                <div className="bg-orange-50 border-b border-orange-100 px-6 py-5 flex items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-orange-800">
                    {dietPlan.recipeName}
                  </h2>
                  <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    {dietPlan.calories}
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 h-fit">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-orange-500" />
                      مواد لازم
                    </h3>

                    <ul className="space-y-2">
                      {(dietPlan.ingredients || []).map((ing, i) => (
                        <li
                          key={`${ing}-${i}`}
                          className="text-sm text-slate-700 flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                          {ing}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">
                        ارزش ماکروها:
                      </h4>
                      <p className="text-sm text-slate-700">
                        {dietPlan.macros}
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 mb-4 text-lg">
                        طرز تهیه
                      </h3>

                      <ol className="space-y-4">
                        {(dietPlan.instructions || []).map((step, i) => (
                          <li key={`${step}-${i}`} className="flex gap-4">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                              {i + 1}
                            </span>
                            <p className="text-slate-700 text-sm pt-0.5">
                              {step}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {dietPlan.whyGood && (
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 text-sm">
                        <h4 className="font-bold text-orange-800 mb-1">
                          چرا این پیشنهاد مناسب شماست؟
                        </h4>
                        <p className="text-slate-600">
                          {dietPlan.whyGood}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                نتایج آموزش ویدیویی
              </h3>

              <button
                type="button"
                onClick={() => setVideoModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                aria-label="بستن"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 bg-slate-50 relative w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed?listType=search&list=${currentExerciseQuery}`}
                title="YouTube Video Search"
                className="w-full h-full border-none relative bg-transparent"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
