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
