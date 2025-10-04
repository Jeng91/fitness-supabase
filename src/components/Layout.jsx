import React from 'react';
import Navbar from './Navbar';
import '../App.css';

const Layout = ({ children, showNavbar = true }) => {
  return (
    <div className="App">
      {showNavbar && <Navbar />}
      {children}
    </div>
  );
};

export default Layout;