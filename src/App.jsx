import React, { useState } from 'react';
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
  CheckCircle2 
} from 'lucide-react';

// کلید API را در این متغیر قرار دهید
const apiKey = ""; 

export default function App() {
  const [activeTab, setActiveTab] = useState('workout');

  // --- وضعیت‌های تمرین ---
  const [userData, setUserData] = useState({
    height: '',
    weight: '',
    goal: '',
    days: '3',
    equipment: ''
  });
  const [images, setImages] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState('');

  // --- وضعیت‌های یخچال ---
  const [fridgeItems, setFridgeItems] = useState('');
  const [dietPlan, setDietPlan] = useState(null);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);
  const [dietError, setDietError] = useState('');

  // --- وضعیت‌های مودال ویدیو ---
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentExerciseQuery, setCurrentExerciseQuery] = useState('');

  // تبدیل فایل عکس به Base64
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      alert('حداکثر ۳ عکس می‌توانید آپلود کنید.');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setImages(prev => [...prev, {
          preview: reader.result,
          base64: base64String,
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  // تابع فراخوانی API با Retry
  const fetchWithRetry = async (url, payload, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
      }
    }
  };

  // تولید برنامه تمرینی
  const generateWorkout = async () => {
    if (!userData.height || !userData.weight || !userData.goal) {
      setWorkoutError('لطفاً قد، وزن و هدف خود را وارد کنید.');
      return;
    }

    setIsGeneratingWorkout(true);
    setWorkoutError('');
    setWorkoutPlan(null);

    try {
      const promptText = `
        تو یک مربی ورزشی حرفه‌ای هستی. با توجه به اطلاعات زیر یک برنامه تمرینی شخصی‌سازی شده به زبان فارسی بساز.
        قد: ${userData.height} سانتی‌متر
        وزن: ${userData.weight} کیلوگرم
        هدف: ${userData.goal}
        تعداد روزهای تمرین در هفته: ${userData.days} روز
        امکانات در دسترس: ${userData.equipment || 'بدون امکانات (فقط وزن بدن)'}
        
        اگر عکسی ارسال شده است، فرم بدن کاربر را به صورت حدسی تحلیل کن و در خلاصه بنویس.
        برنامه را دقیقاً با ساختار JSON زیر برگردان:
        {
          "summary": "تحلیل کلی وضعیت و نکات مهم...",
          "plan": [
            {
              "day": "نام روز (مثلا روز اول - بالاتنه)",
              "exercises": [
                {
                  "name": "نام حرکت",
                  "sets": "تعداد ست",
                  "reps": "تعداد تکرار",
                  "tips": "یک نکته کوتاه برای انجام صحیح"
                }
              ]
            }
          ]
        }
      `;

      const parts = [{ text: promptText }];
      images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64
          }
        });
      });

      const payload = {
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const data = await fetchWithRetry(url, payload);
      const responseText = data.candidates[0].content.parts[0].text;
      setWorkoutPlan(JSON.parse(responseText));

    } catch (error) {
      console.error(error);
      setWorkoutError('خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  // تولید برنامه غذایی
  const generateDiet = async () => {
    if (!fridgeItems) {
      setDietError('لطفاً موجودی یخچال خود را بنویسید.');
      return;
    }

    setIsGeneratingDiet(true);
    setDietError('');
    setDietPlan(null);

    try {
      const promptText = `
        تو یک متخصص تغذیه ورزشی هستی. 
        هدف ورزشکار: ${userData.goal || 'تناسب اندام و سلامتی'}
        مواد غذایی موجود در یخچال کاربر: ${fridgeItems}
        
        با توجه به هدف ورزشکار و تنها با استفاده از مواد غذایی موجود (یا ترکیب با مواد پایه مثل نمک و روغن)، یک وعده غذایی رژیمی و مناسب پیشنهاد بده.
        دقیقاً با ساختار JSON زیر برگردان:
        {
          "recipeName": "نام غذا",
          "calories": "کالری حدودی",
          "macros": "پروتئین: X، کربوهیدرات: Y، چربی: Z",
          "ingredients": ["ماده اول", "ماده دوم"],
          "instructions": ["مرحله اول", "مرحله دوم"],
          "whyGood": "چرا این غذا برای هدف کاربر مناسب است؟"
        }
      `;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const data = await fetchWithRetry(url, payload);
      const responseText = data.candidates[0].content.parts[0].text;
      setDietPlan(JSON.parse(responseText));

    } catch (error) {
      console.error(error);
      setDietError('خطا در دریافت برنامه غذایی. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsGeneratingDiet(false);
    }
  };

  // تابع باز کردن مودال ویدیو
  const openVideoModal = (exerciseName) => {
    const query = encodeURIComponent(`آموزش حرکت ${exerciseName}`);
    setCurrentExerciseQuery(query);
    setVideoModalOpen(true);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">
      
      {/* هدر سایت */}
      <header className="bg-emerald-600 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Activity className="w-8 h-8" />
            <h1 className="text-2xl font-bold">فیت‌هوش | مربی هوشمند شما</h1>
          </div>
          
          <div className="flex bg-emerald-700 rounded-full p-1">
            <button 
              onClick={() => setActiveTab('workout')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'workout' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-100 hover:text-white'}`}
            >
              <Dumbbell className="w-4 h-4" />
              برنامه تمرینی
            </button>
            <button 
              onClick={() => setActiveTab('diet')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'diet' ? 'bg-white text-emerald-700 shadow' : 'text-emerald-100 hover:text-white'}`}
            >
              <Utensils className="w-4 h-4" />
              یخچال هوشمند
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* === تب برنامه تمرینی === */}
        {activeTab === 'workout' && (
          <div className="space-y-8">
            
            {/* فرم دریافت اطلاعات */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  اطلاعات فیزیکی و اهداف
                </h2>
                <p className="text-sm text-slate-500 mt-1">برای دریافت دقیق‌ترین برنامه، فرم زیر را کامل کنید.</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">قد (cm)</label>
                        <input type="number" name="height" value={userData.height} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="۱۷۵" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">وزن (kg)</label>
                        <input type="number" name="weight" value={userData.weight} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="۷۰" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">هدف از تمرین</label>
                      <input type="text" name="goal" value={userData.goal} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="مثلا: افزایش حجم، فیتنس..." />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">تعداد روز تمرین</label>
                      <select name="days" value={userData.days} onChange={handleInputChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                        <option value="2">۲ روز در هفته</option>
                        <option value="3">۳ روز در هفته</option>
                        <option value="4">۴ روز در هفته</option>
                        <option value="5">۵ روز در هفته</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">امکانات ورزشی</label>
                      <textarea name="equipment" value={userData.equipment} onChange={handleInputChange} rows="2" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="مثلا: میله بارفیکس، دمبل یا فقط وزن بدن..."></textarea>
                    </div>
                  </div>

                  {/* آپلود عکس */}
                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-slate-700 mb-2">عکس‌های بدن (اختیاری)</label>
                    <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 relative">
                      <input type="file" accept="image/*" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageUpload} />
                      <Camera className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="text-sm font-medium text-emerald-600">برای انتخاب عکس کلیک کنید</p>
                      <p className="text-xs text-slate-500 mt-1">حداکثر ۳ عکس</p>
                    </div>

                    {images.length > 0 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {images.map((img, index) => (
                          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                            <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                            <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {workoutError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{workoutError}</div>
                )}

                <button 
                  onClick={generateWorkout}
                  disabled={isGeneratingWorkout}
                  className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isGeneratingWorkout ? <><Loader2 className="w-5 h-5 animate-spin" /> در حال پردازش...</> : <><Activity className="w-5 h-5" /> دریافت برنامه تمرینی</>}
                </button>
              </div>
            </div>

            {/* نمایش برنامه تمرینی */}
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
                    <h3 className="text-sm font-bold text-slate-700 mb-2">تحلیل هوش مصنوعی:</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{workoutPlan.summary}</p>
                  </div>

                  <div className="space-y-6">
                    {workoutPlan.plan.map((dayPlan, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-slate-600" />
                          <h3 className="font-bold text-slate-800">{dayPlan.day}</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {dayPlan.exercises.map((ex, exIdx) => (
                            <div key={exIdx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-lg">{ex.name}</h4>
                                <div className="flex gap-4 text-sm text-slate-600 mt-1">
                                  <span className="bg-slate-200 px-2 py-0.5 rounded-md">{ex.sets} ست</span>
                                  <span className="bg-slate-200 px-2 py-0.5 rounded-md">{ex.reps} تکرار</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2"><span className="font-bold text-emerald-600">نکته:</span> {ex.tips}</p>
                              </div>
                              
                              <button 
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

        {/* === تب یخچال هوشمند === */}
        {activeTab === 'diet' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Utensils className="w-5 h-5 text-orange-500" />یخچال هوشمند</h2>
                  <p className="text-sm text-slate-500 mt-1">مواد غذایی موجود را بنویسید.</p>
                </div>
              </div>
              <div className="p-6">
                <textarea 
                  value={fridgeItems}
                  onChange={(e) => setFridgeItems(e.target.value)}
                  rows="4" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none resize-none" 
                  placeholder="مثلا: ۲ عدد تخم مرغ، اسفناج، گوجه فرنگی..."
                ></textarea>

                {dietError && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{dietError}</div>}

                <button 
                  onClick={generateDiet}
                  disabled={isGeneratingDiet}
                  className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isGeneratingDiet ? <><Loader2 className="w-5 h-5 animate-spin" /> در حال پردازش...</> : <><Utensils className="w-5 h-5" /> پیشنهاد غذا</>}
                </button>
              </div>
            </div>

            {dietPlan && (
              <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
                <div className="bg-orange-50 border-b border-orange-100 px-6 py-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-orange-800">{dietPlan.recipeName}</h2>
                  <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{dietPlan.calories}</span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 h-fit">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-500" />مواد لازم</h3>
                    <ul className="space-y-2">
                      {dietPlan.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></div>{ing}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <h4 className="text-xs font-bold text-slate-500 mb-2">ارزش ماکروها:</h4>
                      <p className="text-sm text-slate-700">{dietPlan.macros}</p>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h3 className="font-bold text-slate-800 mb-4 text-lg">طرز تهیه</h3>
                      <ol className="space-y-4">
                        {dietPlan.instructions.map((step, i) => (
                          <li key={i} className="flex gap-4">
                            <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">{i + 1}</span>
                            <p className="text-slate-700 text-sm pt-0.5">{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {dietPlan.whyGood && (
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 text-sm">
                        <h4 className="font-bold text-orange-800 mb-1">چرا این پیشنهاد مناسب شماست؟</h4>
                        <p className="text-slate-600">{dietPlan.whyGood}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* === مودال نمایش ویدیو جستجوی یوتیوب === */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* هدر مودال */}
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                نتایج آموزش ویدیویی
              </h3>
              <button 
                onClick={() => setVideoModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* iframe یوتیوب */}
            <div className="flex-1 bg-slate-50 relative w-full h-full">
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 z-0">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>در حال بارگزاری نتایج از یوتیوب...</span>
                </div>
              </div>
              
              <iframe 
                src={`https://www.youtube.com/embed?listType=search&list=${currentExerciseQuery}`}
                title="YouTube Video Search"
                className="w-full h-full border-none z-10 relative bg-transparent"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

