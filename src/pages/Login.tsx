import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/');
      } else {
        await signUp(email, password);
        // Show success message for sign up
        setError('Check your email for the confirmation link');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="bg-[#111111] rounded-lg p-6">
          <div className="flex mb-6">
            <button
              className={`flex-1 py-2 text-center ${isLogin ? 'border-b-2 border-[#C69B7B]' : 'text-gray-500'}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 text-center ${!isLogin ? 'border-b-2 border-[#C69B7B]' : 'text-gray-500'}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-1">
            {isLogin ? 'Login' : 'Create an account'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isLogin ? 'Sign in to your account' : 'Sign up for a new account'}
          </p>

          {error && (
            <div className="bg-red-900/50 text-red-400 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium">Password</label>
                {isLogin && (
                  <a href="#" className="text-sm text-gray-400 hover:text-white">
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="primary w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#333333]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#111111] text-gray-400">
                  OR CONTINUE WITH
                </span>
              </div>
            </div>

            <button 
              type="button"
              className="secondary w-full flex items-center justify-center gap-2"
              onClick={() => {/* TODO: Implement Google auth */}}
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;