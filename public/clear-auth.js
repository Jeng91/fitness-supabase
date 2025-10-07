// Clear Authentication State Script
// Run this script to clear all authentication data

async function clearAuthState() {
  try {
    console.log('🧹 Clearing all authentication state...');
    
    // Clear localStorage
    console.log('🗑️ Clearing localStorage...');
    localStorage.clear();
    
    // Clear sessionStorage
    console.log('🗑️ Clearing sessionStorage...');
    sessionStorage.clear();
    
    // Clear cookies
    console.log('🗑️ Clearing cookies...');
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.supabase.co";
    });
    
    // Clear any Supabase specific storage
    console.log('🗑️ Clearing Supabase storage...');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ All authentication state cleared!');
    console.log('🔄 Please refresh the page to see changes');
    
    // Force reload
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error clearing auth state:', error);
  }
}

// Add a button to the page for easy clearing - HIDDEN
/*
const clearButton = document.createElement('button');
clearButton.innerHTML = '🔥 Clear Auth State';
clearButton.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
  background: #ff4444;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
`;
clearButton.onclick = clearAuthState;
document.body.appendChild(clearButton);
*/

// To manually clear auth state, run: clearAuthState() in console
console.log('🔧 Auth state cleaner loaded. To clear auth state, run clearAuthState() in console.');