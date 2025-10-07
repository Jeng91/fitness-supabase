// Debug Authentication State
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ibtvipouiddtvsdsccfc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidHZpcG91aWRkdHZzZHNjY2ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMTMyMjUsImV4cCI6MjA3NDY4OTIyNX0.vTAJAs6hEYm3wKEqeGcVdNV5Dm8g3ZrKaHgCh4PgYc4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthState() {
  try {
    console.log('🔍 Checking current authentication state...');
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📝 Current session:', session);
    console.log('❌ Session error:', sessionError);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user);
    console.log('❌ User error:', userError);
    
    if (session && user) {
      console.log('✅ User is authenticated');
      console.log('🆔 User ID:', user.id);
      console.log('📧 Email:', user.email);
      console.log('⏰ Session expires at:', new Date(session.expires_at * 1000));
    } else {
      console.log('❌ User is not authenticated');
    }
    
  } catch (error) {
    console.error('🚨 Error checking auth state:', error);
  }
}

async function clearAuthState() {
  try {
    console.log('🧹 Clearing authentication state...');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Error signing out:', error);
    } else {
      console.log('✅ Successfully signed out');
    }
    
  } catch (error) {
    console.error('🚨 Error clearing auth state:', error);
  }
}

// Run debug
checkAuthState().then(() => {
  console.log('\n🔄 If you want to clear auth state, uncomment the line below:');
  console.log('// clearAuthState();');
});