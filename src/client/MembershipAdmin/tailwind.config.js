/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // TailAdmin-inspired palette
        primary: '#3C50E0',
        secondary: '#80CAEE',
        stroke: '#E2E8F0',
        strokedark: '#2E3A47',
        boxdark: '#24303F',
        'boxdark-2': '#1A222C',
        bodydark: '#AEB7C0',
        bodydark1: '#DEE4EE',
        bodydark2: '#8A99AF',
        graydark: '#333A48',
        'gray-2': '#F7F9FC',
        'gray-3': '#FAFAFA',
        whiten: '#F1F5F9',
        whiter: '#F5F7FD',
        black: '#1C2434',
        'black-2': '#010101',
        body: '#64748B',
        success: '#10B981',
        danger: '#F87171',
        warning: '#FFA70B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
      },
    },
  },
  plugins: [],
}
