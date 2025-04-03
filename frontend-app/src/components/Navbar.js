import React, { useState } from 'react';
import { Calendar, Search, Menu, X } from 'lucide-react';

const Navbar = ({ currentDate, onDateChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <header className="bg-blue-900 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 text-3xl font-bold">
            <span className="text-yellow-400">E-</span> 
            <span className="text-blue-300">Paper</span>
          </div>
          <div className="hidden md:block text-sm">
            <span className="mr-2">|</span>
            <span>A Portrait of Telangana People's Life</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <button 
            className="flex items-center px-3 py-1 bg-blue-800 rounded hover:bg-blue-700"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(currentDate)}</span>
          </button>
          <div className="flex border border-blue-700 rounded overflow-hidden">
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="px-3 py-1 bg-blue-800 text-white placeholder-blue-300 focus:outline-none"
            />
            <button className="px-2 bg-blue-700">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <button 
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-blue-800 flex flex-col space-y-3">
          <button 
            className="flex items-center px-3 py-1 bg-blue-700 rounded"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(currentDate)}</span>
          </button>
          <div className="flex border border-blue-700 rounded overflow-hidden">
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="flex-1 px-3 py-1 bg-blue-800 text-white placeholder-blue-300 focus:outline-none"
            />
            <button className="px-2 bg-blue-700">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Calendar popup */}
      {isCalendarOpen && (
        <div className="absolute top-20 right-4 md:right-20 bg-white p-4 rounded shadow-lg z-10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Select Date</h3>
            <button onClick={() => setIsCalendarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <input 
            type="date" 
            value={currentDate.toISOString().split('T')[0]}
            onChange={(e) => {
              onDateChange(e.target.value);
              setIsCalendarOpen(false);
            }}
            className="border rounded p-2"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}
    </header>
  );
};

export default Navbar;