/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: update this to your source code
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6A5ACD', // SlateBlue
          light: '#836FFF',
          dark: '#483D8B',
        },
        secondary: {
          DEFAULT: '#4682B4', // SteelBlue
        },
        success: {
          DEFAULT: '#3CB371', // MediumSeaGreen
        },
        warning: {
          DEFAULT: '#FFA500', // Orange
        },
        danger: {
          DEFAULT: '#DC143C', // Crimson
        },
        'background-dark': '#1C1C1E', // A dark charcoal color
        'primary-green': '#A8E063',   // A vibrant lime green
        'primary-yellow': '#F3B63A',  // A warm yellow/orange for register
        'input-bg': '#2C2C2E',       // A slightly lighter dark for inputs
        'text-primary': '#FFFFFF',
        'text-secondary': '#8E8E93', // A muted gray for subtitles
        background: {
          light: '#F8F9FA',
          dark: '#121212',
        },
        card: {
          light: '#FFFFFF',
          dark: '#1E1E1E',
        },
        text: {
          light: '#212529',
          dark: '#E5E7EB',
        },
        subtle: {
            light: '#6C757D',
            dark: '#9CA3AF',
        },
        border: {
            light: '#DEE2E6',
            dark: '#374151',
        },
      },
      borderRadius: {
        '2xl': '1rem',
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
}