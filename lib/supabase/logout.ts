import { createClient } from './client';

export async function logout(redirectTo = '/login') {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error.message);
    }
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    // Always redirect the user to the login/home page
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }
}
