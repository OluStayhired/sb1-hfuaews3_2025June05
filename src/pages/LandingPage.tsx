import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Calendar, PenSquare, Clock, Users, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-logo.svg';
import LinkedInSolidLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import googleLogo from '../images/google-logo-48.svg';

function LandingPage() {
  const navigate = useNavigate();
  //const { isAuthenticated } = useAuth();
  const { signIn } = useAuth();
  const { signInWithGoogle } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  //const handleLogin = async () => {
    //console.log('handleLogin called');
    //await signIn();
  //};

  const handleGoogleLogin = async () => {
  try {
    await signInWithGoogle(); // This would be the new function from AuthContext
  } catch (error) {
    console.error('Error signing in with Google:', error);
  }
};

  const handleEmailLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
  setIsAuthModalOpen(false);
  // Consider resetting any modal-related state here if needed
};

  
  return (
    //<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="min-h-screen bg-white">
      <nav className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          
          {/*<div className="bg-blue-600 rounded-tl-xl rounded-br-xl p-2 rotate-180">*/}

         <div className="bg-blue-600 rounded-full p-2 rotate-180">
            <PenTool className="h-9 w-9 fill-white stroke-blue-600" />
          </div>
          <span className="text-2xl  font-bold text-black">SoSavvy</span>
        </div>
        <div className="flex space-x-2 space-x-4">
          <button
            onClick={handleEmailLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login with Email
          </button>
          
          <button
            onClick={handleGoogleLogin}
            className="flex px-4 py-2 bg-white border border-blue-600 flex items-center font-semibold text-blue-600 rounded-lg hover:bg-blue-50 transition-colors space-x-2"
          >
            
            <img src={googleLogo} alt="Google" className="w-5 h-5" />
            <span>
            Join with Google
              </span>
          </button>
          
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          {/*<h1 className="text-6xl font-bold text-gray-900 leading-tight mb-6">
            Create Social Media Posts<br />on Autopilot
          </h1>*/}
          <h1 className="text-7xl font-bold text-gray-900 leading-tight mb-3">
            Get <> <span className="text-blue-600">instant</span> </> content ideas
          </h1>

        {/*<p className="text-3xl text-gray-900 font-bold mb-6">Overcome <> <span className="text-gray-900 underline underline-offset-4" style={{ textDecorationColor: '#2563eb' }}>writer's block</span></> on Social Media</p>*/}
        <p className="text-3xl text-gray-900 font-bold mb-6">Build your <> <span className="text-gray-900 underline underline-offset-4" style={{ textDecorationColor: '#2563eb' }}>Personal Brand</span></> on Autopilot</p>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Stop struggling for inspiration, unlock 14 days of content in minutes!  <br/>
            Write engaging posts to grow on <strong className="text-blue-500">Twitter</strong>, <strong className="text-blue-500">LinkedIn</strong> and <strong className="text-blue-500">Bluesky</strong> 
             {/*<img src={LinkedInSolidLogo} alt="LinkedIn" className="inline-block w-4 h-4" />*/} 
            {/*<img src={BlueskyLogo} alt="Bluesky" className="inline-block w-4 h-4" />*/}
          </p>
          <div className="space-x-4 flex items-center mx-auto w-fit">
            <button
              onClick={handleEmailLogin}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Login with Email
            </button>

            <button
                  onClick={handleGoogleLogin}
                  className="flex px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 text-lg font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                <img src={googleLogo} alt="Google" className="w-5 h-5" />
                <span>Join with Google</span>
            </button>

          </div>
        </div>

        {/*Start Social Media Icons*/}
          <div className="flex justify-center items-center space-x-8 mt-8">
            <div className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 space-x-2 text-blue-700 rounded-full">
              <img src={BlueskyLogo} alt="Bluesky" className="w-8 h-8 rounded-lg" />
            </div>
            <div className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 space-x-2 text-blue-700 rounded-full">
              <img src={LinkedInSolidLogo} alt="LinkedIn" className="w-8 h-8 rounded-lg" />
            </div>

            {/*<div className="flex items-center p-2 bg-blue-100 hover:bg-gray-200 space-x-2 text-blue-700 rounded-tl-xl rounded-br-xl">*/}
            <div className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 space-x-2 text-blue-700 rounded-full">
              <img src={XLogo} alt="Twitter" className="w-8 h-8 rounded-lg" />
            </div>
          </div>


        {/*End Social Media Icons*/}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<PenSquare className="h-8 w-8 text-blue-500" />}
            title="Compose Posts"
            description="Create engaging content for your social media channels"
          />
          <FeatureCard
            icon={<Clock className="h-8 w-8 text-blue-500" />}
            title="Create Schedule"
            description="Plan and schedule your posts for optimal engagement"
          />
          <FeatureCard
            icon={<Calendar className="h-8 w-8 text-blue-500" />}
            title="View Calendars"
            description="Visualize your content calendar across platforms"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-blue-500" />}
            title="Access Accounts"
            description="Manage all your social media accounts in one place"
          />
        </div>

        {/* Start Footer - Full Foot Breakdown */}

<footer className="mt-24 border-t border-gray-300 text-left">
  <div className="max-w-7xl mx-auto px-4 py-12">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8"> {/* Responsive grid */}
      {/* Company Info */}
      <div className="space-y-4">

              <div className="inline-flex bg-blue-600 rounded-full p-2 rotate-180">
                <PenTool className="h-9 w-9 fill-white stroke-blue-600" />
              </div>
        {/*
        <div className="flex  items-center space-x-2">
          <img src={klaowtIcon} alt="Klaowt Icon in-App" className="w-9 h-9 bg-blue-200 p-1.5 rounded-full" />
          <span className="font-bold text-xl">Klaowt</span>
        </div>
        */}
        
        <p className="text-sm text-gray-600">
          The smart solution for audience builders on Bluesky <img src={BlueskyLogo} alt="Bluesky" className="inline-block w-3 h-3 align-middle" /> and LinkedIn <img src={LinkedInSolidLogo} alt="Bluesky" className="inline-block w-3 h-3 align-middle" />
        </p>
        {/* Social links */}
      </div>

      {/* Product Links */}
      <div>
        <h3 className="font-semibold mb-4">Product</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>Features</li>
          <li>Pricing</li>
          <li>Beta Access</li>
          <li>Roadmap</li>
        </ul>
      </div>

      {/* Resources */}
      <div>
        <h3 className="font-semibold mb-4">Resources</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>Blog</li>
          <li>Documentation</li>
          <li>Support</li>
          <li>FAQ</li>
        </ul>
      </div>

      {/* Legal */}
      <div>
        <h3 className="font-semibold mb-4">Legal</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>
            <a href="/privacy.html" className="flex items-center gap-3 hover:text-blue-400 transition-colors">Privacy Policy</a>
          
          </li>
          <li>Terms of Service</li>
          <li>Cookie Policy</li>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600"> {/* Responsive flex */}
        <p className="order-2 sm:order-1">&copy; 2024 soSavvy.app All rights reserved.</p> {/* Order for mobile */}
        <div className="flex space-x-6 order-1 sm:order-2"> 
          {/* Order for mobile */}
          <span>Made with ❤️ for the Bluesky community</span>
          <a href="https://bsky.app/profile/oluadedeji.bsky.social" className="text-blue-500 hover:text-blue-600">
            @oluadedeji.bsky.social
          </a>
        </div>
      </div>
    </div>
  </div>
</footer>

        {/*    
        <div className="mt-32 text-center">
          <h2 className="text-2xl font-semibold text-blue-900 mb-8">Supported Platforms</h2>
          <div className="flex justify-center items-center space-x-8">
            <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 space-x-2 text-blue-700 rounded-tl-xl rounded-br-xl">
              <img src={BlueskyLogo} alt="Bluesky" className="w-12 h-12 rounded-lg" />
            </div>
            <div className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 space-x-2 text-blue-700 rounded-tl-xl rounded-br-xl">
              <img src={LinkedInSolidLogo} alt="LinkedIn" className="w-12 h-12 rounded-lg" />
            </div>
          </div>
        </div>
        */}
     
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        //onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-blue-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default LandingPage;