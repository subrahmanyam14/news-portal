import axios from 'axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/user/login`, {
        email,
        password
      });
      
      const { token, user } = response.data;
      
      // Use the login function from context which now also stores login timestamp
      login(token, user);
      
      // Navigate based on user role
      if(user.role === "superadmin") {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg border border-[#403fbb] md:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#403fbb]">Admin Login</h2>
          <div className="mt-2 h-1 w-16 bg-[#403fbb] mx-auto rounded"></div>
        </div>
        {error && (
          <div className="mb-4 rounded bg-[#ffebee] p-3 text-[#d32f2f] border border-[#ef9a9a]">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white text-gray-800 px-3 py-2 focus:border-[#403fbb] focus:outline-none focus:ring-2 focus:ring-[#403fbb]/30"
              required
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white text-gray-800 px-3 py-2 focus:border-[#403fbb] focus:outline-none focus:ring-2 focus:ring-[#403fbb]/30"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded bg-[#403fbb] py-2 px-4 text-white hover:bg-[#5756c5] focus:outline-none focus:ring-2 focus:ring-[#403fbb] focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </>
            ) : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;