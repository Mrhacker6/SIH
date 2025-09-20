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
    <div className="flex flex-col h-dvh">
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
 <footer className="footer-bg w-full relative">
   {/* Background Image */}
   <div className="absolute inset-0 z-0">
     <img 
       src="/footer.png" 
       alt="Footer Background" 
       className="w-full h-full object-contain" 
     />
   </div>
   
   {/* Content Overlay */}
   <div className="relative z-20 py-12 px-8 text-white">
     {/* Semi-transparent background for text readability */}
     <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6">
       <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
       
       {/* About CampusSathi */}
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-orange-400">About CampusSathi</h3>
         <p className="text-sm text-gray-300 leading-relaxed">
           A multilingual conversational assistant that provides 24/7 support for student queries in Hindi, English, and regional languages. 
           Built to reduce campus office queues and improve information access.
         </p>
         <div className="flex space-x-3">
           <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">AI-Powered</span>
           <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Multilingual</span>
           <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">24/7 Available</span>
         </div>
       </div>

       {/* Quick Links */}
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-orange-400">Quick Links</h3>
         <ul className="space-y-2 text-sm text-gray-300">
           <li><a href="#" className="hover:text-orange-400 transition-colors">Fee Payment</a></li>
           <li><a href="#" className="hover:text-orange-400 transition-colors">Scholarship Forms</a></li>
           <li><a href="#" className="hover:text-orange-400 transition-colors">Academic Calendar</a></li>
           <li><a href="#" className="hover:text-orange-400 transition-colors">Exam Schedule</a></li>
           <li><a href="#" className="hover:text-orange-400 transition-colors">Library Services</a></li>
           <li><a href="#" className="hover:text-orange-400 transition-colors">Hostel Information</a></li>
         </ul>
       </div>

       {/* Contact Information */}
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-orange-400">Contact Us</h3>
         <div className="space-y-3 text-sm text-gray-300">
           <div className="flex items-center space-x-2">
             <span className="text-orange-400">📧</span>
             <span>support@campussathi.edu</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="text-orange-400">📞</span>
             <span>+91-XXX-XXXX-XXX</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="text-orange-400">🏢</span>
             <span>Student Affairs Office</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="text-orange-400">⏰</span>
             <span>Mon-Fri: 9AM-5PM</span>
           </div>
         </div>
       </div>

       {/* Supported Languages */}
       <div className="space-y-4">
         <h3 className="text-lg font-semibold text-orange-400">Supported Languages</h3>
         <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
           <div className="flex items-center space-x-2">
             <span className="w-2 h-2 bg-green-400 rounded-full"></span>
             <span>English</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="w-2 h-2 bg-green-400 rounded-full"></span>
             <span>हिंदी</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="w-2 h-2 bg-green-400 rounded-full"></span>
             <span>मराठी</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="w-2 h-2 bg-green-400 rounded-full"></span>
             <span>বাংলা</span>
           </div>
           <div className="flex items-center space-x-2">
             <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
             <span>More Coming</span>
           </div>
         </div>
         
         {/* Privacy Notice */}
         <div className="mt-4 p-3 bg-slate-700 rounded-lg">
           <p className="text-xs text-gray-400">
             🔒 Your conversations are logged for improvement but remain private. 
             No personal data is stored permanently.
           </p>
         </div>
       </div>
     </div>

     {/* Bottom Bar */}
     <div className="mt-8 pt-6 border-t border-gray-700">
       <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
         <div className="flex items-center space-x-4">
           <span>© 2024 CampusSathi. All rights reserved.</span>
           <span>•</span>
           <span>Built By Team Config ❤️ for students</span>
         </div>
         <div className="flex items-center space-x-4 mt-2 md:mt-0">
           <span>Powered by AI</span>
           <span>•</span>
           <span>Version 1.0</span>
           <span>•</span>
           <a href="#" className="hover:text-orange-400 transition-colors">Privacy Policy</a>
         </div>
       </div>
     </div>
     </div>
   </div>
 </footer>
    </div>
  );
}
