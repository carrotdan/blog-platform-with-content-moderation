"use client";

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { register as registerService } from '../../services/auth.service';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await registerService(username, email, password);
      login(data.user);
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-3xl font-serif font-bold text-center mb-8">Join Bloger.</h2>
      
      {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input 
            type="text" 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            value={username} onChange={(e) => setUsername(e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            value={email} onChange={(e) => setEmail(e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" 
            required 
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            value={password} onChange={(e) => setPassword(e.target.value)} 
          />
        </div>
        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-[#1a8917] hover:bg-[#156d12] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          Sign Up
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account? <Link href="/login" className="text-primary font-bold text-[#1a8917]">Sign in</Link>
      </div>
    </div>
  );
}
