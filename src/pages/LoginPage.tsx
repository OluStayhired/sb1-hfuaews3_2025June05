// src/pages/new_LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Users, Rocket, Mail, Lock, ArrowRight, CheckCircle, UserCircle } from 'lucide-react';
import { CalendarCheck, Calendar, PenSquare, Clock, PenTool, Briefcase, Plus, Minus,Menu,
  Bot, X, Timer, Lightbulb, CircleDollarSign, Star } from 'lucide-react';
import GoogleLogo from '../images/google-logo.svg'; // Assuming you have this asset
import LinkedInLogo from '../images/linkedin-solid-logo.svg'; // Assuming you have this asset
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { TooltipExtended } from '/src/utils/TooltipExtended';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});



function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false); // State to toggle between Sign Up and Sign In
  const navigate = useNavigate();
  //const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const { signInWithGoogle } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dummy handlers for UI demonstration
  //const handleGoogleSignIn = () => {
    //console.log('Google Sign In clicked (no functionality)');
    // No actual functionality
  //};

const handleGoogleLogin = async () => {
  try {
    await signInWithGoogle(); // This would be the new function from AuthContext
  } catch (error) {
    console.error('Error signing in with Google:', error);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate input
      authSchema.parse({ email, password });

      if (isSignUp) {
        await signUp(email, password);
        //onClose();
        // Navigate to the dashboard
        navigate('/dashboard', { replace: true }); 
        //setError('Please check your email to verify your account');
      } else {
        await signIn(email, password);
        //onClose();
        // Navigate to the dashboard
        navigate('/dashboard', { replace: true }); 
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };  

  //const handleEmailAuth = (e: React.FormEvent) => {
   // e.preventDefault();
  //  console.log(`Email ${isSignUp ? 'Sign Up' : 'Sign In'} clicked (no functionality)`);
    // No actual functionality
 // };

  const benefits = [
    {
      icon: Sparkles,
      title: 'Get instant ideas',
      description: 'Transform any website into an endless source of content ideas.',
    },
    {
      icon: Zap,
      title: 'Write scroll-stopping posts',
      description: 'Craft compelling, customer-centric posts that build trust.',
    },
    {
      icon: Users,
      title: 'Attract clients on autopilot',
      description: 'Convert curious visitors into paying clients with engaging content',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full bg-white rounded-xl shadow-lg overflow-hidden flex flex-col lg:flex-row">

        {/* Left Column: Benefits & Testimonial */}
        <div className="hidden sm:block lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-white">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4 leading-tight">
            Effortless content that converts
          </h1>
      </div>
          {/*
          <p className="text-xl font-semibold mb-8">
            Write effortless content that converts!
          </p>
          */}

          <ul className="space-y-6 mb-10">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-2 bg-white bg-opacity-20 rounded-full">
                  <benefit.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">{benefit.title}</h3>
                  <p className="text-sm opacity-90">{benefit.description}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Mini Testimonial */}
          <div className="mt-auto pt-8 border-t border-white border-opacity-30">
            <p className="text-lg italic mb-4">
            "SoSavvy has revolutionized how I plan and publish content today. The time-saved is an instant win for my startup!"
            </p>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src="https://i.imghippo.com/files/beBY1349jQo.jpg" // Example Pexels URL for avatar
                  alt="Eric Rafat"
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                  <img
                    src={LinkedInLogo} // Assuming LinkedIn logo asset
                    alt="LinkedIn"
                    className="w-4 h-4"
                  />
                </div>
              </div>
              <div>
                <p className="font-bold text-white">Eric Rafat</p>
                <p className="text-sm opacity-90">Founder & CEO</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Signup Form */}
        <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            {isSignUp ? 'Create Your Account' : 'Welcome Back 👋'}
          </h2>

          {/* Google Login Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGoogleLogin}
              className="w-3/4 flex items-center justify-center px-4 py-2 border border-blue-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4"
            >
              <img src={GoogleLogo} alt="Google" className="h-5 w-5 mr-3" />
              {isSignUp ? 'Join with Google' : 'Join with Google'}
            </button>
          </div>

          {/* Separator */}
          <div className="relative flex py-4 items-center w-3/4 self-center"> {/* Added w-3/4 and self-center */}
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5 flex flex-col items-center">
            <div className="w-3/4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                name="email"
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="w-3/4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-3/4 flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-blue-500 shadow-lg hover:shadow-blue-500 hover:shadow-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {/*isSignUp ? 'Sign Up' : 'Sign In'*/}
               {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Login with Email')}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;