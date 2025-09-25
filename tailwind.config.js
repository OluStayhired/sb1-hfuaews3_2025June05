/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', //
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
 theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            p: {
              marginTop: '0',
              marginBottom: '0',
            },
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      colors: {
        // Define your custom subtle gray hover shade
        customGray: {
          '75': '#F6F7F9', // Example hex value, find what looks best to you
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'),
  require('@tailwindcss/aspect-ratio'),
 ],
};
