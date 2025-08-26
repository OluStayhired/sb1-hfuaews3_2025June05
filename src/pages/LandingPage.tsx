import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Calendar, PenSquare, Clock, Users, PenTool, Briefcase, Plus, Minus,Menu,
  Bot, CheckCircle,X, Send, ArrowRight,
  Timer, 
  Zap, 
  Lightbulb, Sparkles, CircleDollarSign, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';
import BlueskyLogo from '../images/bluesky-logo.svg';
import BlueskyLogoWhite from '../images/bluesky-logo-white.svg';
import LinkedInLogo from '../images/linkedin-logo.svg';
import LinkedInSolidLogo from '../images/linkedin-solid-logo.svg';
import LinkedInSolidLogoWhite from '../images/linkedin-solid-logo-white.svg';
import XLogo from '../images/x-logo.svg';
import googleLogo from '../images/google-logo-48.svg';
import { TooltipExtended } from '/src/utils/TooltipExtended';

function LandingPage() {
  const navigate = useNavigate();
  //const { isAuthenticated } = useAuth();
  const { signIn } = useAuth();
  const { signInWithGoogle } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const handleGoogleLogin = async () => {
  try {
    await signInWithGoogle(); // This would be the new function from AuthContext
  } catch (error) {
    console.error('Error signing in with Google:', error);
  }
};

//const loginUrl = "https://dapper-dragon-cd4c40.netlify.app/login"; 

const loginUrl = "/login";   

const handleGetStartedClick = () => {
    // This will trigger a full page reload to the specified URL.
    window.location.href = loginUrl;
  };

  
  const handleEmailLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleCloseAuthModal = () => {
  setIsAuthModalOpen(false);
  // Consider resetting any modal-related state here if needed
};

  
  return (
      <div id="top_page" className="min-h-screen bg-white">
        <nav className="px-4 py-3 flex items-center justify-between sm:px-6 sm:py-4">
        <div className="flex items-center space-x-2">

         <div className="bg-blue-600 rounded-full p-1.5 rotate-180 sm:p-2">
            <PenTool className="h-7 w-7 fill-white stroke-blue-600 sm:h-9 sm:w-9" />
          </div>
          <span className="text-2xl  font-bold text-black sm:text-2xl">SoSavvy</span>
        </div>
        
        {/*Desktop Navigation Buttons */}
        {/*  <div className="hidden flex space-x-2 space-x-4 sm:space-y-0 sm:space-x-2">*/}

      

          
        <div className="hidden sm:flex items-center space-x-4">
          <div className="items-center justify-center space-x-2">
              <button
            onClick={() => {
              window.location.href = '#how_it_works';
              }}
              className="px-4 py-2 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
>
            How it works
          </button> 

             <button
            onClick={() => {
              window.location.href = '#key_features';
              }}
              className="px-4 py-2 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
>
            Features
          </button> 

          <button
            onClick={() => {
              window.location.href = '#testimonial';
              }}
              className="px-4 py-2 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
>
            Testimonials
          </button> 

          <button
            onClick={() => {
              window.location.href = '#FAQ';
              }}
              className="px-4 py-2 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
>
            FAQ
          </button> 

           <button
            onClick={() => {
              window.location.href = '#pricing';
              }}
              className="px-4 py-2 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
>
            Pricing
          </button> 
      </div> 
  
          
          <button
            onClick={handleGetStartedClick}
            className="group flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors              
            shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 "
          >
            
           <span>Get Started</span>
           <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          

          
        </div>
        
     {/* Mobile Menu Button (Hamburger) (Visible on mobile, hidden on sm and up) */}
      <div className="sm:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
          aria-label="Toggle navigation"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

 {/* Mobile Menu Overlay */}
      {/* This part of the code is generally correct for the overlay. */}
      {isMobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 bg-white z-40 flex flex-col items-center justify-center space-y-4 py-6"> 

          <button
            onClick={() => {
              window.location.href = '#how_it_works';
              setIsMobileMenuOpen(false);           
              }}
              className="w-11/12 max-w-sm px-4 py-3 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
            How it works
          </button>
          <button
            onClick={() => {
              window.location.href = '#key_features';
              setIsMobileMenuOpen(false);           
              }}
              className="w-11/12 max-w-sm px-4 py-3 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
            Features
          </button>
          <button
            onClick={() => {
              window.location.href = '#testimonial';
              setIsMobileMenuOpen(false);           
              }}
              className="w-11/12 max-w-sm px-4 py-3 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
            Testimonials
          </button>

          <button
            onClick={() => {
              window.location.href = '#FAQ';
              setIsMobileMenuOpen(false);           
              }}
              className="w-11/12 max-w-sm px-4 py-3 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
            FAQ
          </button>
          
          <button
            onClick={() => {
              window.location.href = '#pricing';
              setIsMobileMenuOpen(false);           
              }}
              className="w-11/12 max-w-sm px-4 py-3 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
            Pricing
          </button>

          
          {/* Close button within the overlay */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            aria-label="Close navigation"
          >
            <X className="h-6 w-6" />
          </button>
          
          <button
            //onClick={handleEmailLogin}
            onClick={handleGetStartedClick}
            className="group flex items-center justify-center space-x-2 w-11/12 max-w-sm px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold sm:text-lg"
          >
           
           <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        
        </div>
      )}
        
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 lg:py-24">

            {/*start alternative header */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-6xl leading-tight font-bold mb-2 sm:mb-3"> 
            <p>
              <span className="inline-block bg-gradient-to-l from-blue-400 via-blue-600 to-blue-800 text-transparent bg-clip-text mt-6">
                Fire your <br className="sm:hidden" /> social media manager <br className="sm:hidden" />
                
    <p className="block font-semibold text-xl sm:font-semibold text-2xl sm:text-3xl md:text-3xl lg:text-4xl text-gray-700 leading-tight mt-1 sm:mt-1">
         {/* with unstoppable <br className="sm:hidden" /> online presence */}
         Let SoSavvy write and<br className="sm:hidden block" /> schedule all your posts! 
         </p>
              </span>
            </p>
          </h1>
          {/*end alternative header*/}

          {/* Start Supporting Message */}

          <p className="mt-10 text-base sm:text-3xl md:text-2xl text-gray-700 sm:font-normal font-normal mb-8 sm:mb-10">
            Turn your website into months of <br className="sm:hidden" /> engaging content <br className="sm:block" /> for X and LinkedIn, <br className="sm:hidden" /> in minutes 🔥
          </p>

          {/* End Supporting Message */}

  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-center mx-auto w-fit"> 
    {/* Adjusted button layout for mobile */}

    {/*
    <button
      onClick={handleGoogleLogin}
      className="w-full sm:w-auto flex px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 text-base font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl items-center justify-center space-x-2 sm:px-8 sm:py-4 sm:text-lg">
      <img src={googleLogo} alt="Google" className="w-5 h-5" />
      <span>Join with Google</span>
    </button>
    */}
    
<button
  //onClick={handleEmailLogin}
  onClick={handleGetStartedClick}
  className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-base font-semibold rounded-lg hover:bg-blue-700 transition-colors
             shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 
             sm:px-8 sm:py-4 sm:text-lg"
>
           
           <span>Get Started</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </button>

  </div>
</div>

{/*------------------- Start Images Added for Effect -----------------------------*/}

 {/* Background Images - Absolutely positioned for "scattered" effect with animations */}
      {/* IMPORTANT: These images now have a higher z-index (z-30) to appear on top of the content div (z-20) */}
      {/* Replace placeholder URLs with your actual image URLs (e.g., from Supabase) */}

      {/* Image 1: Top-left, floating circle */}
      <img
        src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/agency_owner_img.png"
        //alt="Abstract blue shape"
        className="hidden sm:block absolute top-8 left-1/4 animate-float opacity-80 w-40 h-40 sm:w-40 sm:h-40 rounded-md  z-30"
        style={{ animationDelay: '0s', animationDuration: '6s' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/agency_owner_img.png"; }}
      />
      {/* Image 2: Bottom-right, floating rounded rectangle */}
      <img
        src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/investor_image.png"
        alt="Abstract pink shape"
        className="hidden sm:block absolute bottom-16 right-1/4 animate-float opacity-80 w-32 h-32 sm:w-32 sm:h-32 rounded-xl transform rotate-12 z-30"
        style={{ animationDelay: '2s', animationDuration: '7s' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/investor_image.png"; }}
      />
      {/* Image 3: Mid-right, smaller floating circle */}
      <img
        src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/marketing_exec.png"
        alt="Abstract green shape"
        className="hidden sm:block absolute top-1/3 right-10 animate-float opacity-80 w-32 h-32 sm:w-32 sm:h-32 rounded-full z-30"
        style={{ animationDelay: '4s', animationDuration: '5s' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/marketing_exec.png"; }}
      />
      {/* Image 4: Bottom-left, larger floating rectangle */}
      <img
        src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/the_startup_founder.png"
        alt="Abstract orange shape"
        className="hidden sm:block absolute bottom-12 left-1/4 animate-float opacity-80 w-40 h-40 sm:w-40 sm:h-40 rounded-xl transform -rotate-6 z-30"
        style={{ animationDelay: '1s', animationDuration: '8s' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/the_startup_founder.png"; }}
      />
      {/* Image 5: Mid-left, medium floating circle */}
      <img
        src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/accountant_image.png"
        alt="Abstract red shape"
        className="hidden sm:block absolute top-1/2 left-10 transform -translate-y-1/2 animate-float opacity-80 w-28 h-28 sm:w-36 sm:h-36 rounded-full z-30"
        style={{ animationDelay: '3s', animationDuration: '6.5s' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/accountant_image.png"; }}
      />
      {/* Image 6: Top-right, smaller floating shape (rounded-lg rotated 45deg for a diamond look) */}
      <img
        src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/law_practice_owner.png"
        alt="Abstract purple shape"
        className="hidden sm:block absolute top-16 right-1/4 animate-float opacity-80 w-40 h-40 sm:w-40 sm:h-40 rounded-lg transform rotate-15 z-30"
        style={{ animationDelay: '5s', animationDuration: '5.5s' }}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/80x80/eef2ff/4338ca?text=Shape6"; }}
      />

      {/* Custom CSS for float animation */}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg); /* Move up and slightly rotate */
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }
        .animate-float {
          animation-name: float;
          animation-iteration-count: infinite; /* Keeps repeating indefinitely */
          animation-timing-function: ease-in-out; /* Smooth start and end */
          animation-direction: alternate; /* Plays forward then backward for a smooth loop */
        }
      `}</style>



        
{/*-------------------- End images Added for effect -----------------------------*/}    

        {/*Start Social Media Icons
          <div className="flex justify-center items-center space-x-8 mt-8">
            <div className="flex items-center border-8 border-gray-100 p-3 bg-gray-900 hover:bg-blue-100 space-x-2 text-blue-700 rounded-full">
              <img src={BlueskyLogoWhite} alt="Bluesky" className="w-9 h-9 rounded-lg" />
            </div>
            <div className="flex items-center border-8 border-gray-100 p-3 bg-gray-900 hover:bg-blue-100 space-x-2 text-blue-700 rounded-full">
              <img src={LinkedInSolidLogoWhite} alt="LinkedIn" className="w-9 h-9 rounded-lg" />
            </div>

            
            <div className="flex items-center border-8 border-gray-100 p-3 bg-gray-900 hover:bg-blue-100 space-x-2 text-blue-700 rounded-full">
              <img src={XLogo} alt="Twitter" className="w-9 h-9 rounded-lg" />
            </div>
          </div>

          */}

        {/*End Social Media Icons*/}

{/*----------------- Start Video Section for SoSavvy ----------------------- */}
        <section className="mt-24 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
          Content Planning on Steroids 👇
        </h2>
        {/*<p className="text-sm sm:text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
            Unlock weeks of website-powered, customer-focused content in minutes
          </p>
        */}
          <p className="text-xl sm:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto">
            Unlock weeks of customer-focused content with zero effort. <br/> Generate months of posts from websites you love.   
          </p>  
        <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl">
          {/* Outer div for responsive aspect ratio (16:9 - 56.25%) */}
          <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
            <iframe
              src="https://player.vimeo.com/video/1096029698?badge=0&autopause=0&player_id=0&app_id=58479"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-share" // Ensure `encrypted-media` is included for broader compatibility
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title="Latest_SoSavvy_Video_Design"
            ></iframe>
          </div>
        </div>
      </section>
{/*-------------------------- End Video Section for SoSavvy -------------------------------- */}
        
{/*----------- start mini testimonials -----------------------------*/}



<section className="mt-24 text-center">
  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
    Why Founders & Creators Love SoSavvy❤️
  </h2>
  <div className="flex items-center justify-center flex-wrap gap-4 mb-6">
    {/* Mini Testimonial 1 */}
    <a href="#testimonial" className="no-underline">
    <div className="inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-2xl sm:rounded-full shadow-sm 
      hover:border-blue-300 transition-all group">
      <div className="relative">
        <img
          src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/eric_rafat_linkedin.jpg"
          alt="Eric Rafat"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
          <img src={LinkedInSolidLogo} alt="LinkedIn" className="w-3 h-3" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-left text-gray-900">Eric Rafat </p>
        <p className="sm:hidden font-normal text-xs text-left text-gray-500">CEO at Foundersbeta</p>
        <p className="text-sm text-left text-gray-800">"SoSavvy takes the guesswork out of content planning!"</p>
      </div>
    
    </div>
      </a>

    {/* Mini Testimonial 2 */}
    <a href="#testimonial" className="no-underline">
    <div className="hidden sm:inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-full shadow-sm hover:border-blue-300 transition-all group rounded-full shadow-sm ">
      <div className="relative">
        <img
          src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/julia_yuvchenko_linkedin.jpg"
          alt="Julia Yuvchenko"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
          <img src={LinkedInSolidLogo} alt="Twitter" className="w-3 h-3" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-left text-gray-900">Julia Yuvchenko</p>
        <p className="text-sm text-left text-gray-800">"The AI suggestions have 10x my content!"</p>
      </div>
    </div>
    </a>

    {/* Mini Testimonial 3 */}
    <a href="#testimonial" className="no-underline">
    <div className="hidden sm:inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-full shadow-sm 
      hover:border-blue-300 transition-all group rounded-full shadow-sm ">
      <div className="relative">
        <img
          src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/ericka_bates_linkedin.jpg"
          alt="Ericka Bates"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
          <img src={LinkedInSolidLogo} alt="Bluesky" className="w-3 h-3" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-left text-gray-900">Ericka Bates</p>
        <p className="text-sm text-left text-gray-800">"SoSavvy has improved my personal brand!"</p>
      </div>
    </div>
    </a>

    {/* Mini Testimonial 4 */}
    <a href="#testimonial" className="no-underline">
    <div className="hidden sm:inline-flex items-center space-x-3 px-6 py-3 rounded-full shadow-sm bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-full shadow-sm hover:border-blue-300 transition-all group">
      <div className="relative">
        <img
          src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/jon_hillis_linkedin.jpg"
          alt="Jonathan Hillis"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
          <img src={LinkedInSolidLogo} alt="LinkedIn" className="w-3 h-3" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-left text-gray-900">Jonathan Hillis</p>
        <p className="text-sm text-left text-gray-800">"Awesome for staying consistent on LinkedIn!"</p> 
      </div>
    </div>
    </a>
        {/* Mini Testimonial 5 */}
    <a href="#testimonial" className="no-underline">
    <div className="hidden sm:inline-flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-full shadow-sm 
      hover:border-blue-300 transition-all group rounded-full shadow-sm">
      <div className="relative">
        <img
          src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/travis_street_bluesky.jpg"
          alt="Travis Street"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
          <img src={BlueskyLogo} alt="LinkedIn" className="w-3 h-3" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-left text-gray-900">Travis Street</p>
        <p className="text-sm text-left text-gray-800">"Amazing tool for creating focused posts!"</p>
      </div>
    </div>
    </a>
  </div>
  

  {/* Single 5-star rating below all testimonials */}
  <div className="flex justify-center mt-4">
    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
  </div>
</section>


        {/*------------end mini testimonials -------------------------------*/}



        
        <section className="mt-24 text-center">
          <div className="inline-flex items-center border-8 border-red-200 space-x-2 px-3 py-2 bg-red-400 text-white rounded-full text-lg mb-6 cursor-pointer"      
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}>
              
                <Sparkles className="w-4 h-4" />
                <span>Here's the Problem</span>
          </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">
                Attracting customers <br/> on social media is tough 😏
            </h2>
          <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
            Many founders have tried to crack the code, unfortunately many have hit the same issues:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 3: Manual Content Creation */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="mb-4 flex items-center justify-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Timer className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Manual Content Creation Steals Time.</h3>
              <p className="text-gray-600 text-sm">
                As a content creator or social media manager, you're stuck in a content grind, constantly seeking LinkedIn content inspiration instead of building your business.
              </p>
            </div>

          {/* Card 2: Generic AI Tools */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="mb-4 flex items-center justify-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Generic AI Tools Misses Your Audience.</h3>
              <p className="text-gray-600 text-sm">
                Automated AI LinkedIn post generators and Twitter post generators churn out content fast, but it rarely connects deeply or converts your ideal customers.
              </p>
            </div>

               {/* Card 4: Simple Schedulers */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="mb-4 flex items-center justify-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple Schedulers Don't Generate Leads.</h3>
              <p className="text-gray-600 text-sm">
                Social media scheduling platforms like Buffer or Hootsuite help you post, but they don't solve the core problem: creating strategic content that actually generates inbound requests.
              </p>
            </div>
            
            {/* Card 1: Hiring Staff */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-100">
              <div className="mb-4 flex items-center justify-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <CircleDollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Hiring More Staff <br/>may be Unaffordable.</h3>
              <p className="text-gray-600 text-sm">
                A dedicated social media manager means significant investment, often without guaranteed content that drives inquiries.
              </p>
            </div>
   
          </div>
        <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto mt-6">
        These all lead to the same frustration: more effort, less impact, and no reliable path to customers
          </p>
        </section>
        {/* End New Interactive Section */}

      {/* Start New Gradient Section */}
        <section className="mt-24 text-center">
          <div className="inline-flex items-center border-8 border-blue-200 space-x-2 px-3 py-2 bg-blue-400 text-white rounded-full text-lg mb-6 cursor-pointer"
                 
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}
            >
            <Sparkles className="w-4 h-4" />
                <span>We have the Solution!</span>
          </div>
        </section>
        
        <section className="mt-2 py-16 rounded-3xl bg-gradient-to-r from-blue-100 via-white to-white text-gray-900 text-center rounded-xl">
    <div className="max-w-4xl mx-auto px-6">

        {/* Sparkles Icon - Centered at the very top */}
        <div className="flex justify-center mb-6"> {/* Added mb-6 for spacing below the icon */}
            <div className="p-3 bg-blue-400 bg-opacity-20 rounded-full">
                <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
        </div>

        {/* Headline (H2) - Now stands alone, centered by parent text-center */}
        <h2 className="text-2xl sm:text-4xl font-bold mb-6"> {/* Added mb-6 for spacing below the headline */}
            Create <span className="text-blue-400 justify-center items-center">problem-focused</span> content that <br/>connects with your customers' pain 😊  
        </h2>

        {/* Paragraph (P) - Centered by parent text-center */}
        <p className="text-xl font-light opacity-90 max-w-2xl mx-auto">
            SoSavvy crafts compelling, ICP-aligned social media content that <br/> resonates with your customers and generates inquiries on AutoPilot
        </p>

    </div>
</section>
        {/* End New Gradient Section */}

<section id="how_it_works" className="mt-24 text-center">
          <div className="inline-flex items-center border-8 border-blue-200 space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-300 text-white rounded-full text-lg mb-6 cursor-pointer"
                 
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}
            >
            
            <Sparkles className="w-4 h-4" />
                <span>How it Works</span>
          </div>
        </section>  

 {/*----------------- Start Create Campaign Video Section for SoSavvy ----------------------- */}
        <section className="mt-16 text-center">
        <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">
            SoSavvy reads your website <br className="sm:hidden"/> and 
            <br className="hidden sm:block"/>builds the right content 
            <br className="sm:hidden"/> for your goals 🔥
        </h2>
        <p className="text-xl sm:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto">
            Watch how weeks of linkedin and twitter posts are created in seconds!
          
          </p>
        <div className="max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl">
          {/* Outer div for responsive aspect ratio (16:9 - 56.25%) */}
          <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
              <video
              src="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-videos/sosavvy_video_to_gif.mp4"
              className="absolute top-0 left-0 w-full h-full object-cover"
              controls           // Shows playback controls (play/pause, volume, fullscreen)
              autoPlay           // Starts playing automatically (often requires 'muted')
              loop               // Loops the video automatically
              muted              // Essential for autoplay to work in most browsers
              playsInline        // Recommended for mobile browsers to play video inline
      >
    
             
             </video>   
          </div>
        </div>
      </section>
{/*-------------------------- End Create Campaign Video Section for SoSavvy -------------------------------- */}              

{/* Start How it Works Section */}
<section className="mt-8 text-center">
<h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">
  Turn your invisible efforts <br className="sm:hidden"/> into <br className="hidden sm:block"/>regular inquiries in <br className="sm:hidden"/> 3 easy steps 🔥
</h2>
  
  <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
    Audience Analysis . Content Strategy . Scheduled Posts
  </p>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
    {/* Step 1: Analyze Company Website */}
    <div> {/* This div now acts as the individual grid column item */}
      {/* Image - fully separated from the text card below */}
      <div className="w-full h-48 mb-6"> {/* Added mb-6 for spacing between image and text card */}
        <img
          src="https://i.imghippo.com/files/dL4344ps.png"
          alt="Website Analysis Screenshot"
          className="w-full h-full object-cover rounded-lg" 
        />
      </div>
      {/* Text Content - now in its own dedicated card */}
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-3"><span className="text-gray-300">Step 1</span> <br/> We Analyze your Website</h3>
        <p className="text-gray-600 text-sm">
          We undertake a deep analysis of your business to understand your ideal customer and the problem you solve to establish the type of content you need.
        </p>
      </div>
    </div>

    {/* Step 2: Get a 14-day Content Calendar */}
    <div>
      <div className="w-full h-48 mb-6">
        <img
          src="https://i.imghippo.com/files/dE6647lM.png"
          alt="Content Calendar Screenshot"
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-3"><span className="text-gray-300">Step 2</span> <br/>We Create Content Calendars</h3>
        <p className="text-gray-600 text-sm">
          We create your social media content strategy based specifically on your goals, then we develop a 2-week campaign and content calendar around it.
        </p>
      </div>
    </div>

    {/* Step 3: Generate LinkedIn & Twitter Posts at Scale */}
    <div>
      <div className="w-full h-48 mb-6">
        <img
          //src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          src="https://i.imghippo.com/files/cidD9233HWc.png"
          alt="Post Generation Screenshot"
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-3"><span className="text-gray-300">Step 3</span> <br/>We Generate Content at Scale</h3>
        <p className="text-gray-600 text-sm">
          With just a couple of clicks every month, you will consistently put out content that speaks directly to your target audience's challenges.
        </p>
      </div>
    </div>
  </div>
</section>
{/* End How it Works Section */}

<section id="key_features" className="mt-24 text-center">
          <div className="inline-flex items-center border-8 border-blue-200 space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-300 text-white rounded-full text-lg mb-6 cursor-pointer"
                 
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}
            >
            <Sparkles className="w-4 h-4" />
                <span>SoSavvy's Key Features</span>
          </div>
        </section>
        
{/* Start New Gradient Section with picture on the right */}
        
  <section className="relative rounded-3xl mt-8 py-8 sm:mt-24 sm:py-24 bg-gradient-to-r from-blue-100 via-white to-white text-gray-900 overflow-hidden px-4 sm:px-6">
      {/* Main Content Wrapper - Holds text and desktop buttons, also acts as reference for absolute image */}
      <div className="max-w-6xl mx-auto relative z-10 md:flex md:items-center md:justify-between md:space-x-8">

        {/* Text Content (Left Side on Desktop, Top on Mobile) */}
        <div className="md:w-2/5 text-center md:text-left"> {/* Added text-center for mobile */}
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 leading-tight"> {/* Responsive text size */}
            Target your customer's deepest desires & fears
          </h2>
          <p className="text-base sm:text-lg font-light opacity-90 max-w-lg mx-auto md:mx-0"> {/* Responsive text size, mx-auto for mobile center */}
            Analyze your website to uncover what truly drives your ideal customers, surface their pains and aspirations for laser-focused content.
          </p>

          {/* Buttons (Desktop Version: visible from md breakpoint up) */}
          {/* These buttons appear after text on desktop */}
          <div className="hidden md:flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8 justify-center md:justify-start">
      
            <button
              //onClick={handleEmailLogin}
              onClick={handleGetStartedClick}
              className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold
                           shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 
              "
            >
               
               <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

          </div>
        </div>

        {/* This div helps create space on desktop if image is absolute and not taking up flex space */}
        {/* On mobile, this will be hidden */}
        <div className="hidden md:block md:w-3/5 lg:w-1/2">
            {/* This div serves as a placeholder to push text left if needed */}
        </div>

      </div> {/* End max-w-6xl mx-auto div */}

      {/* Image (Desktop Version: Absolute, visible from md breakpoint up) */}
      {/* Object-contain ensures it won't crop, but might have letterboxing if aspect ratio doesn't match container */}
      <img
        src="https://i.imghippo.com/files/aSkU4676wcg.png"
        alt="SoSavvy Product Screenshot"
        //className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-contain rounded-xl z-0" 
          className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-cover rounded-xl z-0"
      />

      {/* Image (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* This image appears after text on mobile, is larger, and uses object-contain to prevent cropping */}
      <div className="md:hidden mt-8 flex justify-center"> {/* mt-8 for spacing after text content */}
  <img
    src="https://i.imghippo.com/files/XzVz8015w.png"
    alt="SoSavvy Product Screenshot"
    className="w-full h-auto shadow-md max-w-full sm:max-w-2xl md:max-w-3xl rounded-xl z-0 object-cover" // Changed max-w, and strongly recommend object-contain
  />
</div>

      {/* Buttons (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* These buttons appear after the mobile image */}
      <div className="md:hidden flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8 justify-center"> {/* mt-6 for spacing after image */}

    
        
        <button
          //onClick={handleEmailLogin}
          onClick={handleGetStartedClick}
          className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold
                       shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 "
        >
          
           <span>Get Started</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

      </div>

    </section> 
        
{/* End New Gradient Section with picture on the right */}

{/* Start New Gradient Section with picture on the left */}      
        
    <section className="relative rounded-3xl mt-8 py-8 sm:mt-24 sm:py-24 md:py-32 bg-gradient-to-l from-blue-100 via-white to-white text-gray-900 overflow-hidden px-4 sm:px-6">

      {/* Main Content Wrapper - On desktop, positions text to the right */}
      {/* This div effectively holds the content that aligns to the right on desktop */}
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:justify-end md:items-center">

        {/* Text Content (Right on Desktop, Top on Mobile) */}
        {/* mx-auto for mobile centering, md:mx-0 removes it for desktop, md:w-2/5 for desktop width */}
        <div className="md:w-2/5 text-center md:text-left mx-auto md:mx-0">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 leading-tight">
            Create effective content strategies in seconds
          </h2>
          <p className="text-base sm:text-lg font-light opacity-90 max-w-lg mx-auto md:mx-0">
            Stop random acts of content. Build strategic campaigns that ensure every post addresses customer pain and guides them to your solution.
          </p>

        </div>

        {/* No explicit placeholder div is needed here. md:justify-end on the parent handles the right alignment of the text content. */}

      </div> {/* End max-w-6xl mx-auto div */}

      {/* Image (Desktop Version: Absolute to left, visible from md breakpoint up) */}
      <img
        src="https://i.imghippo.com/files/ZsdT4458qo.png"
        alt="SoSavvy Product Screenshot"
        className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-cover rounded-xl z-0"
      />

      {/* Image (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* This image appears after text on mobile, is larger, and uses object-contain to prevent cropping */}
      <div className="md:hidden mt-8 flex justify-center"> {/* mt-8 for spacing after text content */}
        <img
          src="https://i.imghippo.com/files/JZk5353JQA.png"
          alt="SoSavvy Product Screenshot"
          className="w-full h-auto max-w-full rounded-xl z-0 object-contain" // max-w-full to make it as wide as possible
        />
      </div>

      {/* Buttons (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* These buttons appear after the mobile image */}
      <div className="md:hidden flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8 justify-center"> 

        <button
          //onClick={handleEmailLogin}
          onClick={handleGetStartedClick}
          className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold
                       shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 "
        >
            
           <span>Get Started</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

      </div>

    </section>    

{/* End New Gradient Section with picture on the left */}            
              

{/* Start New Gradient Section with picture on the right */}
        
  <section className="relative rounded-3xl mt-8 py-8 sm:mt-24 sm:py-24 bg-gradient-to-r from-blue-100 via-white to-white text-gray-900 overflow-hidden px-4 sm:px-6">
      {/* Main Content Wrapper - Holds text and desktop buttons, also acts as reference for absolute image */}
      <div className="max-w-6xl mx-auto relative z-10 md:flex md:items-center md:justify-between md:space-x-8">

        {/* Text Content (Left Side on Desktop, Top on Mobile) */}
        <div className="md:w-2/5 text-center md:text-left">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 leading-tight"> 
            Publish relatable posts that actually convert
          </h2>
          <p className="text-base sm:text-lg font-light opacity-90 max-w-lg mx-auto md:mx-0"> 
           Forget generic AI. Create non-salesy, human-sounding social content that builds authority and sparks curiosity, driving direct inquiries.
          </p>

          {/* Buttons (Desktop Version: visible from md breakpoint up) */}
          {/* These buttons appear after text on desktop */}
          <div className="hidden md:flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8 justify-center md:justify-start">

            <button
              //onClick={handleEmailLogin}
              onClick={handleGetStartedClick}
              className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold
                           shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 "
            >
             
               <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>

          </div>
        </div>

        {/* This div helps create space on desktop if image is absolute and not taking up flex space */}
        {/* On mobile, this will be hidden */}
        <div className="hidden md:block md:w-3/5 lg:w-1/2">
            {/* This div serves as a placeholder to push text left if needed */}
        </div>

      </div> {/* End max-w-6xl mx-auto div */}

      {/* Image (Desktop Version: Absolute, visible from md breakpoint up) */}
      {/* Object-contain ensures it won't crop, but might have letterboxing if aspect ratio doesn't match container */}
      <img
        src="https://i.imghippo.com/files/FN9394Xsg.png"
        alt="SoSavvy Product Screenshot"
        //className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-contain rounded-xl z-0" 
          className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-cover rounded-xl z-0"
      />

      {/* Image (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* This image appears after text on mobile, is larger, and uses object-contain to prevent cropping */}
      <div className="md:hidden mt-8 flex justify-center"> {/* mt-8 for spacing after text content */}
  <img
    src="https://i.imghippo.com/files/Wfta6982BA.png"
    alt="SoSavvy Product Screenshot"
    className="w-full h-auto shadow-md max-w-full sm:max-w-2xl md:max-w-3xl rounded-xl z-0 object-cover" // Changed max-w, and strongly recommend object-contain
  />
</div>

      {/* Buttons (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* These buttons appear after the mobile image */}
      <div className="md:hidden flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8 justify-center"> {/* mt-6 for spacing after image */}

        
        <button
          //onClick={handleEmailLogin}
          onClick={handleGetStartedClick}
          className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold
                       shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 "
        >
          
           <span>Get Started</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

      </div>

    </section> 
        
{/* End New Gradient Section with picture on the right */}

{/* Start New Gradient Section with picture on the left */}      
        
    <section className="relative rounded-3xl mt-8 py-8 sm:mt-24 sm:py-24 md:py-32 bg-gradient-to-l from-blue-100 via-white to-white text-gray-900 overflow-hidden px-4 sm:px-6">

      {/* Main Content Wrapper - On desktop, positions text to the right */}
      {/* This div effectively holds the content that aligns to the right on desktop */}
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:justify-end md:items-center">

        {/* Text Content (Right on Desktop, Top on Mobile) */}
        {/* mx-auto for mobile centering, md:mx-0 removes it for desktop, md:w-2/5 for desktop width */}
        <div className="md:w-2/5 text-center md:text-left mx-auto md:mx-0">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-6 leading-tight">
            Schedule content across platforms with no effort
          </h2>
          <p className="text-base sm:text-lg font-light opacity-90 max-w-lg mx-auto md:mx-0">
            Publish effortlessly. Automatically schedule strategic posts across LinkedIn, X, and Bluesky, freeing you to focus on your business as inquiries roll in.
          </p>

  
        </div>


      </div> {/* End max-w-6xl mx-auto div */}

      {/* Image (Desktop Version: Absolute to left, visible from md breakpoint up) */}
      <img
        src="https://i.imghippo.com/files/aabl7885uD.png"
        alt="SoSavvy Product Screenshot"
        //className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-contain rounded-xl z-0"
          className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 md:w-3/5 lg:w-1/2 h-[450px] md:h-[550px] object-cover rounded-xl z-0"
      />

      {/* Image (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* This image appears after text on mobile, is larger, and uses object-contain to prevent cropping */}
      <div className="md:hidden mt-8 flex justify-center"> 
        <img
          src="https://i.imghippo.com/files/pRPI1002zk.png"
          alt="SoSavvy Product Screenshot"
          className="w-full h-auto max-w-full rounded-xl z-0 object-contain" // max-w-full to make it as wide as possible
        />
      </div>

      {/* Buttons (Mobile Version: In-flow, visible below md breakpoint) */}
      {/* These buttons appear after the mobile image */}
      <div className="md:hidden flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-6 sm:mt-8 justify-center"> 
        {/* mt-6 for spacing after image */}
        <button
          //onClick={handleEmailLogin}
          onClick={handleGetStartedClick}
          className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold
                       shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 
          "
        >
          
           <span>Get Started</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

      </div>

    </section>    

{/* End New Gradient Section with picture on the left */}    
            
  <section className="relative mt-24 py-16 bg-gradient-to-b from-blue-500 via-blue-400 to-white text-gray-900 rounded-xl overflow-hidden">

    <div className="max-w-4xl mx-auto px-6 text-center z-10 relative">
        {/* Sparkles Icon (Maintained positioning from previous iteration) */}
        <div className="flex justify-center mb-6">
            <div className="p-3 bg-blue-50 bg-opacity-20 rounded-full">
                <Sparkles className="w-8 h-8 text-blue-200" />
            </div>
        </div>

        {/* Main Title */}
        <h2 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white leading-tight mb-8">
            Ready to get paying customers with content that writes itself?💰
        </h2>

        {/* Secondary Title / Subsection */}
        <p className="text-xl md:text-2xl font-light text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed text-white">
            Let's turn your website into a powerful customer magnet. We'll take you from guesswork to leads in minutes. It's the intelligent way to connect with your ideal audience, without sounding salesy or spammy.
        </p>

        {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">       
          <button
            //onClick={handleEmailLogin}
            onClick={handleGetStartedClick}
            className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold sm:px-4 sm:py-3 sm:text-base
            shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 " // Adjusted mobile button size/text for consistency
          >
            
           <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>


        </div>

        {/* Image - Centered and "unconstrained" */}

    </div>
          <img
            src="https://i.imghippo.com/files/hjBw8272m.png"
            alt="SoSavvy Dashboard Screenshot"
            className="hidden sm:block w-full max-w-5xl h-[300px] md:h-[400px] lg:h-[500px] object-cover rounded-lg mx-auto mt-8 block"
        />
</section> 

{/*----------------------Start Testimonials Section--------------------*/}

<section id="testimonial" className="mt-24 text-center">
  <div className="inline-flex items-center border-8 border-blue-200 space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-300 text-white rounded-full text-lg mb-6 cursor-pointer"

         
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}
    >
    
    <Sparkles className="w-4 h-4" />
    <span>What Our Customers Say</span>
  </div>
  <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
    Hear From Founders & Creators Like You
  </h2>
  <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
    SoSavvy is helping entrepreneurs transform their social media presence into a pipeline building machine.
  </p>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
   {/* Testimonial 1 */}
    <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-left">
      <div className="flex items-center mb-4">
        <div className="relative mr-4">
          <img
            src="https://i.imghippo.com/files/beBY1349jQo.jpg"
            alt="Eric Rafat Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
            <img src={LinkedInSolidLogo} alt="Bluesky" className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Eric Rafat</p>
          <p className="text-sm text-gray-600">CEO at Foundersbeta</p>
        </div>
      </div>
      <div className="flex mb-3">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
      </div>
      <p className="text-base text-gray-800 mb-4">
        SoSavvy has taken the guesswork out of content planning, now I can focus on what matters, growing my startup. It's perfect for organic and consistent growth across platforms.
      </p>
      <a href="https://www.foundersbeta.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
        foundersbeta.com
      </a>
    </div>

    
    {/* Testimonial 2 */}
    <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-left">
      <div className="flex items-center mb-4">
        <div className="relative mr-4">
          <img
            src="https://i.imghippo.com/files/cGvb7319MV.jpg"
            alt="Jonathan Hillis"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
            <img src={LinkedInSolidLogo} alt="LinkedIn" className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Jonathan Hillis</p>
          <p className="text-sm text-gray-600">CEO at Tenure</p>
        </div>
      </div>
      <div className="flex mb-3">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
      </div>
      <p className="text-base text-gray-800 mb-4">
        SoSavvy made it so easy for me to create and turn content ideas into scheduled posts. Creating customer focused content is not easy, SoSavvy has been a total time-saver
      </p>
      <a href="https://www.tenurefi.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
        tenurefi.com
      </a>
    </div>

    {/* Testimonial 3 */}
    <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-left">
      <div className="flex items-center mb-4">
        <div className="relative mr-4">
          <img
            src="https://i.imghippo.com/files/mcUX9191eo.jpg"
            alt="Julia Yuvchenko Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
            <img src={LinkedInSolidLogo} alt="Twitter" className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Julia Yuvchenko</p>
          <p className="text-sm text-gray-600">Founder of ContentFarm</p>
        </div>
      </div>
      <div className="flex mb-3">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
      </div>
      <p className="text-base text-gray-800 mb-4">
        As a busy founder, SoSavvy is a game-changer. Its clean design makes it very easy to generate content calendars in no time. Also love the AI rewriting tool for improving my content!
      </p>
      <a href="http://contentfarm.club" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
        contentfarm.club
      </a>
    </div>

    {/* Testimonial 4 */}
    <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-left">
      <div className="flex items-center mb-4">
        <div className="relative mr-4">
          <img
            src="https://i.imghippo.com/files/wQ7409qJU.jpg"
            alt="Eric Rafat Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
            <img src={LinkedInSolidLogo} alt="LinkedIn" className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Travis Street</p>
          <p className="text-sm text-gray-600">Technology Consultant</p>
        </div>
      </div>
      <div className="flex mb-3">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
      </div>
      <p className="text-base text-gray-800 mb-4">
        Awesome product Olu, SoSavvy delivers relatable content that resonates with my target audience. Super cool, it checks out my website and delivers weeks of content in seconds!  
      </p>
      <a href="https://www.travisstreet.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
        travisstreet.com
      </a>
    </div>
  </div>
</section>

{/*---------------------End Testimonials Section -------------------------*/}

        <section id="pricing" className="mt-24 text-center">
          <div className="inline-flex items-center border-8 border-blue-200 space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-300 text-white rounded-full text-lg cursor-pointer"
                 
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}
            >
            <Sparkles className="w-4 h-4" />
                <span>An Easy Pricing Plan</span>
          </div>
        </section>
        
<section className=" py-16 bg-white text-gray-900 rounded-xl overflow-hidden text-center">
  <div className="max-w-6xl mx-auto px-6"> {/* Increased max-width for wider layout */}
    <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
      Simple Pricing, Powerful Results 🚀
    </h2>
    <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
      Unlock all of SoSavvy's features and start converting your audience into paying customers.
    </p>

    {/* Main pricing card container with right-to-left gradient */}
    <div className="bg-gradient-to-r from-blue-500 to-blue-300 p-8 rounded-xl shadow-xl text-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"> {/* Grid for horizontal spread */}
        {/* Left Column: Pricing and CTA */}
        <div className="text-center md:text-right md:pr-8 md:border-r md:border-blue-400"> {/* Added border-r for visual separation */}
          <h3 className="text-2xl sm:text-3xl font-semibold mb-4">All-in-One Content Writer</h3>
          <div className="flex items-baseline justify-center md:justify-end mb-6">
            <span className="text-6xl sm:text-9xl text-center font-extrabold">$25</span> {/* Larger font for price */}
            <span className="text-2xl font-medium">/month</span>
          </div>
          <p className="text-lg mb-8 opacity-90">No more wasting your time posting for LIKES.</p>

          {/* Buttons */}
      <div className="flex flex-col sm:flex-row sm:mr-24 sm:justify-end justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16"> 

        
          <button
            //onClick={handleEmailLogin}
            onClick={handleGetStartedClick}
            className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold sm:px-4 sm:py-3 sm:text-base
                         shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 "
          >
            
           <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>


        </div>
      
        </div>

        {/* Right Column: Features List */}
        <div className="text-left md:pl-8">
          <h4 className="text-2xl font-semibold mb-4">What's Included:</h4>
          <ul className="space-y-3">
           
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
               <TooltipExtended text="⚡ Get a full, 14-day calendar of strategic posts, planned around your insights and goals. Never wonder what to post next – it's already done and optimized for impact.">
              <span className="underline decoration-white decoration-2 cursor-pointer">14-Day High-Value Content Calendars</span>
              </TooltipExtended>  
            </li>
                            
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
              <TooltipExtended text="⚡ SoSavvy analyzes your website's content, services, and offerings to pinpoint your ideal customer's pains, desires, and the exact language they use. No more guesswork about what matters.">
              <span className="underline decoration-white decoration-2 cursor-pointer">Deep Customer & Niche Insights</span>
              </TooltipExtended>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
              <TooltipExtended text="⚡ Go beyond generic. Our intelligent AI crafts non-salesy, compelling posts that truly sound like you, directly addressing your audience's needs and building genuine connection.">
              <span className="underline decoration-white decoration-2 cursor-pointer">Human-Like Content Creation</span>
              </TooltipExtended>
            </li>

            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
              <span>Seamless Cross-Platform Scheduling</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
              <span>Automated Post Publishing</span>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
              <TooltipExtended text="⚡Maintain full control. Review, refine, and edit any generated post before it goes live, ensuring every message aligns perfectly with your brand voice.">
              <span className="underline decoration-white decoration-2 cursor-pointer">Flexible Content Editor & Drafts</span>
              </TooltipExtended>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
               <TooltipExtended text="⚡Ensure your content reaches your audience when they're most active, wherever they are in the world. SoSavvy intelligently schedules posts for maximum visibility across different timezones.">
              <span className="underline decoration-white decoration-2 cursor-pointer">Timezone-Aware Scheduling</span>
               </TooltipExtended>
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-6 h-6 text-white mr-3 flex-shrink-0" />
              <span>Dedicated Customer Support</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

  {/*----------------------------- End of the Pricing Section ----------------------------------*/}

  {/*------------------------------start of the FAQ Section -------------------------------------*/}    

<section id="FAQ" className="mt-24 text-center">
  <div className="inline-flex items-center border-8 border-blue-200 space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-300 text-white rounded-full text-lg mb-6 cursor-pointer"
         
            onClick={() => {
              window.location.href = '#top_page';
              setIsMobileMenuOpen(false);           
              }}
    >
    <Sparkles className="w-4 h-4" />
    <span>Frequently Asked Questions</span>
  </div>
  <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
    Have Questions? 🤔
  </h2>
  <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
   Learn how SoSavvy can transform your social media strategy.
  </p>

  <div className="max-w-3xl mx-auto space-y-4 text-left">
    {/* FAQ Item 1 */}
   <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
    My social media content often feels generic. How does SoSavvy ensure it truly connects with my specific audience?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>We go deep to understand your customers' specific pains and desires, then craft content that speaks directly to them. This creates that "aha!" moment, building trust and ensuring your message resonates, rather than getting lost in the noise. It's about turning passive scrollers into engaged prospects.</p>
  </div>
</details>


    {/* FAQ Item 2 */}
     <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
    I spend too much time creating social media content. How does SoSavvy save me time?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>SoSavvy drastically cuts down your content creation time by crafting and scheduling months of customer-focused content for you in minutes. You'll free up hours currently spent brainstorming, writing, and posting, letting you focus on core business growth.</p>
  </div>
</details>

    {/* FAQ Item 3 */}
     <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
   How will SoSavvy help me generate actual leads, not just likes?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>Our content is designed specifically to drive inbound leads, not just vanity metrics. By deeply understanding your customers' needs and positioning your solution effectively, we create content that motivates prospects to take action – whether that's booking a meeting, sending an inquiry, or making a purchase. We focus on content that fills your sales pipeline.</p>
  </div>
</details>

     {/* FAQ Item 4 */}
    <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
   I struggle with consistent posting. How does SoSavvy ensure my social media presence remains active?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>SoSavvy tackles inconsistency head-on by providing months of pre-scheduled, high-quality content. This ensures your brand maintains a steady, authoritative presence across platforms like LinkedIn, Twitter, and Bluesky, keeping you top-of-mind with your audience and positively impacting algorithm visibility.</p>
  </div>
</details>

     {/* FAQ Item 5 */}
     <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"> 
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
    Is this solution only for large companies, or does it work for startups and smaller teams too?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>SoSavvy is designed to empower founders, marketers, and small teams who are resource-constrained but ambitious. Our solution provides the strategic, high-quality content capabilities typically reserved for larger companies, allowing you to compete effectively and scale your inbound lead generation without needing a huge in-house content team.</p>
  </div>
</details>

     {/* FAQ Item 6 */}
     <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
    How does SoSavvy understand my specific business and customer pain points to create effective content?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>We start with a focused onboarding process to deeply understand your unique value proposition, target audience, and their core challenges. Our process is built around extracting those specific pain points, ensuring every piece of content we craft directly addresses what your customers care about most, leading to genuine connections and inquiries.</p>
  </div>
</details>

     {/* FAQ Item 7 */}
    <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
    What kind of results can I expect from using SoSavvy?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>You can expect to grow inbound leads more efficiently by consistently publishing customer-focused content that actually converts. This means a more engaged audience, a healthier sales pipeline, and a reduced reliance on manual, high-effort outbound methods. Ultimately, it frees you to focus on closing deals and scaling your business.</p>
  </div>
</details>

     {/* FAQ Item 8 */}
     <details className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
  <summary class="flex items-center justify-between p-5 cursor-pointer font-semibold text-lg text-gray-800 hover:bg-gray-50 transition-colors">
    How quickly can I get started and see my content live?
    <div class="relative w-6 h-6 rounded-full items-center p-2 justify-center"> 
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 group-open:hidden transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
      <svg class="absolute inset-0 w-6 h-6 text-blue-500 hidden group-open:block transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16"></path>
      </svg>
    </div>
  </summary>
  <div class="px-5 pb-5 text-gray-700">
    <p>SoSavvy is designed for speed and efficiency. Once onboarded, we can get months of crafted and scheduled customer-focused content ready for you in minutes, allowing you to launch or refresh your social media strategy almost immediately and start seeing an impact on your lead generation efforts very quickly.</p>
  </div>
</details>
    
  </div>
</section>


  {/*------------------------------- end of the FAQ Section --------------------------------------*/}       


  {/* ------------------------------ Start Final Call to Action Section --------------------------*/}    

<section class="mt-24 py-16 bg-gradient-to-b from-blue-500 via-blue-400 to-white text-gray-900 text-center rounded-xl">
  <div class="max-w-4xl mx-auto px-6">
    <h2 class="text-2xl text-white sm:text-4xl md:text-6xl font-bold leading-tight mb-8">
      Stop wasting your time on random acts of content
    </h2>
    <p class="text-white text-md sm:text-xl md:text-2xl font-light text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
      Start Creating With Purpose on SoSavvy 🚀
    </p>

        {/* Buttons */}
      <div className="flex flex-col sm:mr-10  sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16"> 
          <button
            //onClick={handleEmailLogin}
            onClick={handleGetStartedClick}
            className="group flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold sm:px-4 sm:py-3 sm:text-base
                         shadow-lg shadow-blue-500/60       
             hover:shadow-xl hover:shadow-blue-500/80 " // Adjusted mobile button size/text for consistency
          >
            
           <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>


        </div>
   
  </div>
</section>



  {/*---------------------------------End Final Call to Action Section-----------------------------*/}      


      
        {/* Start Footer - Full Foot Breakdown */}

<footer className="mt-24 border-t border-gray-300 text-left">
  <div className="max-w-7xl mx-auto px-4 py-12">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8"> {/* Responsive grid */}
      {/* Company Info */}
      <div className="space-y-4">

              <div className="inline-flex bg-blue-600 rounded-full p-2 rotate-180">
                <PenTool className="h-9 w-9 fill-white stroke-blue-600" />
              </div>
        
        <p className="text-sm text-gray-600">
          The smart solution for audience builders on Bluesky <img src={BlueskyLogo} alt="Bluesky" className="inline-block w-3 h-3 align-middle" /> LinkedIn <img src={LinkedInSolidLogo} alt="LinkedIn" className="inline-block w-3 h-3 align-middle" /> and Twitter <img src={XLogo} alt="Twitter" className="inline-block w-3 h-3 align-middle" />
        </p>
        {/* Social links */}
      </div>

      {/* Product Links */}
      <div>
        <h3 className="font-semibold mb-4">Product</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li> <a href="#key_features" className="no-underline hover:text-blue-400 transition-colors">Features</a></li>
          <li> <a href="#pricing" className="no-underline hover:text-blue-400 transition-colors">Pricing</a></li>
          <li> <a href="#testimonial" className="no-underline hover:text-blue-400 transition-colors">Testimonials</a></li>
          <li className="text-gray-400">Roadmap <em>(soon)</em></li>
        </ul>
      </div>

      {/* Resources */}
      <div>
        <h3 className="font-semibold mb-4">Resources</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="text-gray-400">Blog <em>(soon)</em></li>
          <li className="text-gray-400">Docs <em>(soon)</em></li>
          <li className="text-gray-400">Support <em>(soon)</em></li>
          <li> <a href="#FAQ" className="no-underline hover:text-blue-400 transition-colors">FAQ</a></li>
        </ul>
      </div>

      {/* Legal */}
      <div>
        <h3 className="font-semibold mb-4">Legal</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>
            <a href="/privacy.html" className="flex items-center gap-3 hover:text-blue-400 transition-colors">Privacy Policy</a>      
          </li>
          <li>
              <a href="/terms.html" className="flex items-center gap-3 hover:text-blue-400 transition-colors">Terms of Service</a>
          </li>
              <a href="/cookie.html" className="flex items-center gap-3 hover:text-blue-400 transition-colors">Cookie Policy</a>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600"> {/* Responsive flex */}
        <p className="order-2 sm:order-1">&copy; 2024 soSavvy.app All rights reserved.</p> {/* Order for mobile */}
        <div className="flex space-x-6 order-1 sm:order-2"> 
          {/* Order for mobile */}
          <span>Made with ❤️ for founders and creators building their personal brand with purpose</span>
            <a href="https://bsky.app/profile/oluadedeji.bsky.social" className="text-blue-500 hover:text-blue-600">@oluadedeji.bsky.social
          </a>
        </div>
      </div>
    </div>
  </div>
</footer>
</main>
        
    </div>
  );
}

export default LandingPage;