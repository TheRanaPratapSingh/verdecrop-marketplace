/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { 50:'#f0f7f0', 100:'#dceedd', 200:'#b8ddb9', 300:'#85c487', 400:'#4ea352', 500:'#2d8a32', 600:'#1e6e24', 700:'#175820', 800:'#13461b', 900:'#0e3615', 950:'#071c0a' },
        stone:  { 50:'#faf9f7', 100:'#f2efe9', 200:'#e4ddd2', 300:'#d0c4b3', 400:'#b8a48f', 500:'#9e876c', 600:'#876e55', 700:'#6e5844', 800:'#5a4838', 900:'#4a3b2e' },
        sage:   { 50:'#f4f7f2', 100:'#e5ede1', 200:'#c8d9c2', 300:'#a2bc98', 400:'#769a6a', 500:'#557c49', 600:'#426139', 700:'#354e2e', 800:'#2b3f26', 900:'#243420' },
        cream:  '#fdf9f4',
        parchment: '#f5efe6',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"Outfit"', '"DM Sans"', 'system-ui', 'sans-serif'],
        label:   ['"Syne"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up':    'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':    'fadeIn 0.4s ease-out forwards',
        'scale-in':   'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-right':'slideRight 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer':    'shimmer 2s infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:     { from: { opacity:'0', transform:'translateY(24px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        fadeIn:     { from: { opacity:'0' }, to: { opacity:'1' } },
        scaleIn:    { from: { opacity:'0', transform:'scale(0.94)' }, to: { opacity:'1', transform:'scale(1)' } },
        slideRight: { from: { opacity:'0', transform:'translateX(-16px)' }, to: { opacity:'1', transform:'translateX(0)' } },
        shimmer:    { '0%': { backgroundPosition:'-200% 0' }, '100%': { backgroundPosition:'200% 0' } },
        float:      { '0%,100%': { transform:'translateY(0)' }, '50%': { transform:'translateY(-8px)' } },
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.12)',
        'nav':        '0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04)',
        'modal':      '0 8px 16px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.16)',
        'btn':        '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(30,110,36,0.25)',
        'btn-hover':  '0 2px 4px rgba(0,0,0,0.1), 0 8px 20px rgba(30,110,36,0.35)',
        'inset-sm':   'inset 0 1px 3px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      letterSpacing: {
        'widest2': '0.2em',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        'hero-mesh': 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(46,139,50,0.15) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(21,86,32,0.1) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}