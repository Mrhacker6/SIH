"use client";
"use client";
import { useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const translations: Record<string, any> = {
  English: {
    appName: "CampusSathi",
    sidebar: [
      { label: "Home", icon: "🏠" },
      { label: "Services", icon: "🧰" },
      { label: "Accounts", icon: "📂" },
      { label: "Contact", icon: "☎️" },
    ],
    headerTitle: "Citizen",
    kbChecking: "Checking knowledge base…",
    kbWarming: "Warming knowledge base…",
    kbReady: "Knowledge base ready",
    uidPlaceholder: "UID (optional)",
    typing: "Typing…",
    inputPlaceholder: "Type your question…",
    send: "Send",
    quickAsks: ["Fees Status", "HOD Contact", "My Section", "Admin Contact"],
    hero: "Hero Graphic",
    latestTitle: "Latest Updates",
    latestItem: "Scholarship released",
    readMore: "Read more",
    chooseLang: "Choose Language",
    greeting: "Hello! I am CampusSathi.",
  },
  "हिंदी": {
    appName: "CampusSathi",
    sidebar: [
      { label: "मुखपृष्ठ", icon: "🏠" },
      { label: "सेवाएँ", icon: "🧰" },
      { label: "खातें", icon: "📂" },
      { label: "सम्पर्क", icon: "☎️" },
    ],
    headerTitle: "नागरिक",
    kbChecking: "ज्ञान आधार जाँच हो रही है…",
    kbWarming: "ज्ञान आधार प्रारंभ हो रहा है…",
    kbReady: "ज्ञान आधार तैयार",
    uidPlaceholder: "यूआईडी (वैकल्पिक)",
    typing: "टाइप हो रहा है…",
    inputPlaceholder: "प्रश्न लिखें...",
    send: "भेजें",
    quickAsks: ["Fees Status", "HOD Contact", "My Section", "Admin Contact"],
    hero: "हीरो ग्राफ़िक",
    latestTitle: "नवीनतम अपडेट",
    latestItem: "किसान सम्मान निधि जारी",
    readMore: "और पढ़ें",
    chooseLang: "भाषा चुनें",
    greeting: "नमस्ते! मैं CampusSathi हूँ।",
  },
  "मराठी": {
    appName: "CampusSathi",
    sidebar: [
      { label: "मुखपृष्ठ", icon: "🏠" },
      { label: "सेवा", icon: "🧰" },
      { label: "खाती", icon: "📂" },
      { label: "संपर्क", icon: "☎️" },
    ],
    headerTitle: "नागरिक",
    kbChecking: "ज्ञानभांडार तपासत आहे…",
    kbWarming: "ज्ञानभांडार सुरू होत आहे…",
    kbReady: "ज्ञानभांडार तयार",
    uidPlaceholder: "UID (ऐच्छिक)",
    typing: "टाइपिंग…",
    inputPlaceholder: "तुमचा प्रश्न लिहा…",
    send: "पाठवा",
    quickAsks: ["Fees Status", "HOD Contact", "My Section", "Admin Contact"],
    hero: "हिरो ग्राफिक",
    latestTitle: "ताज्या घडामोडी",
    latestItem: "शिष्यवृत्ती जाहीर",
    readMore: "अधिक वाचा",
    chooseLang: "भाषा निवडा",
    greeting: "नमस्कार! मी CampusSathi आहे.",
  },
  "বাংলা": {
    appName: "CampusSathi",
    sidebar: [
      { label: "প্রধান পৃষ্ঠা", icon: "🏠" },
      { label: "সেবা", icon: "🧰" },
      { label: "হিসাব", icon: "📂" },
      { label: "যোগাযোগ", icon: "☎️" },
    ],
    headerTitle: "নাগরিক",
    kbChecking: "নলেজ বেস যাচাই হচ্ছে…",
    kbWarming: "নলেজ বেস প্রস্তুত হচ্ছে…",
    kbReady: "নলেজ বেস প্রস্তুত",
    uidPlaceholder: "UID (ঐচ্ছিক)",
    typing: "টাইপ হচ্ছে…",
    inputPlaceholder: "আপনার প্রশ্ন লিখুন…",
    send: "পাঠান",
    quickAsks: ["Fees Status", "HOD Contact", "My Section", "Admin Contact"],
    hero: "হিরো গ্রাফিক",
    latestTitle: "সর্বশেষ আপডেট",
    latestItem: "স্কলারশিপ প্রকাশিত",
    readMore: "আরও পড়ুন",
    chooseLang: "ভাষা নির্বাচন করুন",
    greeting: "হ্যালো! আমি CampusSathi.",
  },
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [kbReady, setKbReady] = useState<boolean | null>(null);
  const [language, setLanguage] = useState<string>("English");

  // Initialize greeting based on selected language
  useEffect(() => {
    setMessages([{ role: "assistant", content: translations[language].greeting }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("http://localhost:8000/status");
        if (!res.ok) throw new Error("status not available");
        const data = await res.json();
        if (active) setKbReady(!!data.kb_ready);
      } catch {
        if (active) setKbReady(false);
      } finally {
        if (active) setTimeout(poll, 5000);
      }
    }
    poll();
    return () => {
      active = false;
    };
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uid || null, message: text, language }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Server unavailable. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function quickAsk(q: string) {
    setInput(q);
  }

  // When language changes, reset greeting and keep chat in sync
  useEffect(() => {
    setMessages([{ role: "assistant", content: translations[language].greeting }]);
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header-gradient px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/state-logo.png" alt="State Logo" className="h-16 w-16 object-contain" />
          <span className="text-white font-semibold text-xl">{translations[language].appName}</span>
        </div>
        <div className="text-white/90 text-sm">
          {translations[language].headerTitle}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] relative">
        <aside className="sidebar-bg text-white p-4 space-y-2">
        <div className="flex items-center gap-2 text-xl font-semibold mb-4">
          <img src="/icon.png" alt="App Icon" className="h-6 w-6" />
          <span>{translations[language].appName}</span>
        </div>
        <nav className="space-y-2">
          {translations[language].sidebar.map((i: any) => (
            <button
              key={i.label}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <span>{i.icon}</span>
              <span className="text-white/95">{i.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="p-4 overflow-y-auto bg-slate-100">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-slate-800 font-semibold flex-1">{translations[language].headerTitle}</div>
            {kbReady === null && (
              <span className="text-xs bg-slate-100 text-slate-700 border border-slate-300 rounded-full px-2 py-1">
                {translations[language].kbChecking}
              </span>
            )}
            {kbReady === false && (
              <span className="text-xs bg-yellow-100 text-yellow-900 border border-yellow-300 rounded-full px-2 py-1">
                {translations[language].kbWarming}
              </span>
            )}
            {kbReady === true && (
              <span className="text-xs bg-green-100 text-green-900 border border-green-300 rounded-full px-2 py-1">
                {translations[language].kbReady}
              </span>
            )}
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder={translations[language].uidPlaceholder}
              className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {messages.map((m, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div
                  className={`h-8 w-8 rounded-full ${
                    m.role === "assistant" ? "bg-blue-100" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`${
                    m.role === "assistant"
                      ? "bg-blue-50 text-slate-900"
                      : "bg-slate-50 text-slate-900"
                  } rounded-lg px-3 py-2 shadow border border-slate-200 text-sm w-full leading-relaxed`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-slate-600">{translations[language].typing}</div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={translations[language].inputPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              onClick={send}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {translations[language].send}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {translations[language].quickAsks.map(
              (a: string) => (
                <button
                  key={a}
                  onClick={() => quickAsk(a)}
                  className="text-sm bg-orange-100 text-orange-800 hover:bg-orange-200 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {a}
                </button>
              )
            )}
          </div>
        </div>
      </main>

      <aside className="p-4 bg-slate-50 space-y-3">
        <div className="bg-[#0b3c66] text-white rounded-xl p-4 h-32 flex items-center justify-center">
          <span className="opacity-95">{translations[language].hero}</span>
        </div>
        <div className="bg-[#0b3c66] text-white rounded-xl p-4">
          <div className="text-sm opacity-95">{translations[language].latestTitle}</div>
          <div className="mt-2 text-sm text-white">{translations[language].latestItem}</div>
          <button className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-300">
            {translations[language].readMore}
          </button>
        </div>
        <div className="bg-white rounded-xl p-3 shadow">
          <div className="text-sm mb-2 text-slate-800">{translations[language].chooseLang}</div>
          <div className="flex flex-wrap gap-2">
            {["English", "हिंदी", "मराठी", "বাংলা"].map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  language === l
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </aside>
      </div>

 {/* Footer */}
 <footer className="footer-bg w-full relative overflow-hidden min-h-[400px] mt-auto bg-slate-800">
   {/* Modern Background with Gradient Overlay */}
   <div className="absolute inset-0 z-0">
     <img 
       src="/footer.png" 
       alt="Footer Background" 
       className="w-full h-full object-cover" 
     />
     {/* Gradient overlays for modern look */}
     <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/15 to-indigo-900/25"></div>
     <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10"></div>
   </div>
   
   {/* Content Overlay */}
   <div className="relative z-20 py-2 px-4 text-white">
     {/* Modern glassmorphism container */}
     <div className="backdrop-blur-sm bg-black/40 border border-white/20 rounded-lg p-3 max-w-4xl mx-auto shadow-lg">
       <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
         
         {/* About CampusSathi */}
         <div className="space-y-2 group">
           <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide mb-1">
             About CampusSathi
           </h3>
           <p className="text-xs text-white leading-relaxed font-medium">
             A multilingual conversational assistant that provides 24/7 support for student queries in Hindi, English, and regional languages. 
             Built to reduce campus office queues and improve information access.
           </p>
           <div className="flex flex-wrap gap-1">
             <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium shadow-md hover:shadow-green-500/25 transition-all duration-300 hover:scale-105">
               AI-Powered
             </span>
             <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium shadow-md hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105">
               Multilingual
             </span>
             <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium shadow-md hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105">
               24/7 Available
             </span>
           </div>
         </div>

         {/* Quick Links */}
         <div className="space-y-2 group">
           <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide mb-1">
             Quick Links
           </h3>
           <ul className="space-y-1">
             <li>
               <a href="#" className="group/link flex items-center text-xs text-white hover:text-cyan-300 transition-all duration-300 hover:translate-x-1 p-1 rounded hover:bg-white/10">
                 <span className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mr-2 group-hover/link:w-2 transition-all duration-300"></span>
                 Fee Payment
               </a>
             </li>
             <li>
               <a href="#" className="group/link flex items-center text-xs text-white hover:text-cyan-300 transition-all duration-300 hover:translate-x-1 p-1 rounded hover:bg-white/10">
                 <span className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mr-2 group-hover/link:w-2 transition-all duration-300"></span>
                 Scholarship Forms
               </a>
             </li>
             <li>
               <a href="#" className="group/link flex items-center text-xs text-white hover:text-cyan-300 transition-all duration-300 hover:translate-x-1 p-1 rounded hover:bg-white/10">
                 <span className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mr-2 group-hover/link:w-2 transition-all duration-300"></span>
                 Academic Calendar
               </a>
             </li>
             <li>
               <a href="#" className="group/link flex items-center text-xs text-white hover:text-cyan-300 transition-all duration-300 hover:translate-x-1 p-1 rounded hover:bg-white/10">
                 <span className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mr-2 group-hover/link:w-2 transition-all duration-300"></span>
                 Exam Schedule
               </a>
             </li>
             <li>
               <a href="#" className="group/link flex items-center text-xs text-white hover:text-cyan-300 transition-all duration-300 hover:translate-x-1 p-1 rounded hover:bg-white/10">
                 <span className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mr-2 group-hover/link:w-2 transition-all duration-300"></span>
                 Library Services
               </a>
             </li>
             <li>
               <a href="#" className="group/link flex items-center text-xs text-white hover:text-cyan-300 transition-all duration-300 hover:translate-x-1 p-1 rounded hover:bg-white/10">
                 <span className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mr-2 group-hover/link:w-2 transition-all duration-300"></span>
                 Hostel Information
               </a>
             </li>
           </ul>
         </div>

         {/* Contact Information */}
         <div className="space-y-2 group">
           <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide mb-1">
             Contact Us
           </h3>
           <div className="space-y-1">
             <div className="group/contact flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                 📧
               </div>
               <span className="text-xs text-white group-hover/contact:text-cyan-300 transition-colors duration-300">support@campussathi.edu</span>
             </div>
             <div className="group/contact flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                 📞
               </div>
               <span className="text-xs text-white group-hover/contact:text-cyan-300 transition-colors duration-300">+91-XXX-XXXX-XXX</span>
             </div>
             <div className="group/contact flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                 🏢
               </div>
               <span className="text-xs text-white group-hover/contact:text-cyan-300 transition-colors duration-300">Student Affairs Office</span>
             </div>
             <div className="group/contact flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                 ⏰
               </div>
               <span className="text-xs text-white group-hover/contact:text-cyan-300 transition-colors duration-300">Mon-Fri: 9AM-5PM</span>
             </div>
           </div>
         </div>

         {/* Supported Languages */}
         <div className="space-y-2 group">
           <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent tracking-wide mb-1">
             Supported Languages
           </h3>
           <div className="grid grid-cols-2 gap-1">
             <div className="group/lang flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse shadow-md"></div>
               <span className="text-xs text-white group-hover/lang:text-cyan-300 transition-colors duration-300 font-medium">English</span>
             </div>
             <div className="group/lang flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse shadow-md"></div>
               <span className="text-xs text-white group-hover/lang:text-cyan-300 transition-colors duration-300 font-medium">हिंदी</span>
             </div>
             <div className="group/lang flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse shadow-md"></div>
               <span className="text-xs text-white group-hover/lang:text-cyan-300 transition-colors duration-300 font-medium">मराठी</span>
             </div>
             <div className="group/lang flex items-center space-x-2 p-1 rounded hover:bg-white/5 transition-all duration-300">
               <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse shadow-md"></div>
               <span className="text-xs text-white group-hover/lang:text-cyan-300 transition-colors duration-300 font-medium">বাংলা</span>
             </div>
             <div className="group/lang flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/5 transition-all duration-300 col-span-2">
               <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
               <span className="text-xs text-white group-hover/lang:text-cyan-300 transition-colors duration-300 font-medium">More Coming Soon</span>
             </div>
           </div>
           
           {/* Privacy Notice */}
           <div className="mt-3 p-2 bg-gradient-to-r from-slate-900/60 to-slate-800/60 rounded-lg border border-white/20 backdrop-blur-sm shadow-md">
             <div className="flex items-start space-x-2">
               <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                 🔒
               </div>
               <p className="text-xs text-white leading-relaxed">
                 Your conversations are logged for improvement but remain private. 
                 No personal data is stored permanently.
               </p>
             </div>
           </div>
         </div>
       </div>

       {/* Bottom Bar */}
       <div className="mt-3 pt-2 border-t border-gradient-to-r from-white/20 to-transparent">
         <div className="flex flex-col md:flex-row justify-between items-center text-xs">
           <div className="flex items-center space-x-4 mb-2 md:mb-0">
             <span className="text-white font-medium">© 2024 CampusSathi. All rights reserved.</span>
             <div className="hidden md:block w-px h-3 bg-white/30"></div>
             <span className="text-white flex items-center space-x-1">
               <span className="text-red-400 animate-pulse text-sm">❤️</span>
               <span>Built for students</span>
             </span>
           </div>
           <div className="flex items-center space-x-4">
             <span className="text-white font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
               Powered by AI
             </span>
             <div className="w-px h-3 bg-white/30"></div>
             <span className="text-white">Version 1.0</span>
             <div className="w-px h-3 bg-white/30"></div>
             <a href="#" className="text-white hover:text-cyan-400 transition-all duration-300 hover:underline font-medium">
               Privacy Policy
             </a>
           </div>
         </div>
       </div>
     </div>
   </div>
 </footer>
    </div>
  );
}
