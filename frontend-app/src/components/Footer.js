import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#212529] text-white py-6 border-t border-[#403fbb]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-[#403fbb]">E-</span> 
              <span className="text-white">Paper</span>
            </h3>
            <p className="text-gray-400 text-sm">
              A Portrait of Telangana People's Life
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3 text-white">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-[#403fbb] transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-[#403fbb] transition-colors">Archives</a></li>
              <li><a href="#" className="hover:text-[#403fbb] transition-colors">Subscribe</a></li>
              <li><a href="#" className="hover:text-[#403fbb] transition-colors">Contact Us</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3 text-white">Archives</h3>
            <p className="text-gray-400 text-sm">
              Access our newspaper archives dating back to 1989. Browse by date or search for specific topics.
            </p>
            <button className="mt-2 px-4 py-2 bg-[#403fbb] rounded hover:bg-[#5756c5] transition-colors">
              Browse Archives
            </button>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} E-Paper. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;