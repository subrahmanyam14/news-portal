import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NewspaperViewer from './components/NewspaperViewer';
import LoadingSpinner from './components/LoadingSpinner';

const App = () => {

  const [currentDate, setCurrentDate] = useState(new Date());


  const handleDateChange = (date) => {
    setCurrentDate(new Date(date));
  };


  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar 
        currentDate={currentDate} 
        onDateChange={handleDateChange} 
      />
      <NewspaperViewer 
        currentDate={currentDate}
        onDateChange={handleDateChange}
      />
      <Footer />
    </div>
  );
};

export default App;