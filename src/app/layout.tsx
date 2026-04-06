import type { Metadata } from 'next'
import NavAuth from './components/NavAuth'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Masters Pool 2026',
  description: 'Pick your foursome. May the best team win.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@300;400;600&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --green: #005540;
            --green-light: #006747;
            --gold: #C9A84C;
            --gold-light: #e8c97a;
            --cream: #FAF6EE;
            --cream-dark: #F0EAD8;
            --dark: #1C1C1C;
            --gray: #6B6B6B;
            --border: #DDD5C0;
            --red: #B94040;
            --white: #FFFFFF;
          }
          html, body {
            background: var(--cream);
            color: var(--dark);
            font-family: 'Source Sans 3', sans-serif;
            font-weight: 300;
            min-height: 100vh;
          }
          h1, h2, h3 { font-family: 'Playfair Display', serif; font-weight: 700; }
          a { color: var(--green); text-decoration: none; }
          a:hover { text-decoration: underline; }
          input, select, button { font-family: 'Source Sans 3', sans-serif; }
          .page { max-width: 960px; margin: 0 auto; padding: 0 1.25rem 4rem; }
          .btn {
            display: inline-block;
            padding: 0.65rem 1.5rem;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 600;
            transition: opacity 0.15s, transform 0.1s;
          }
          .btn:hover { opacity: 0.88; }
          .btn:active { transform: scale(0.98); }
          .btn:disabled { opacity: 0.45; cursor: not-allowed; }
          .btn-primary { background: var(--green); color: #fff; }
          .btn-danger  { background: var(--red);   color: #fff; }
          .btn-ghost   { background: transparent; color: var(--green); border: 1.5px solid var(--green); }
          .input {
            width: 100%;
            padding: 0.65rem 0.9rem;
            border: 1.5px solid var(--border);
            border-radius: 4px;
            background: var(--white);
            font-size: 0.95rem;
            color: var(--dark);
            transition: border-color 0.15s;
          }
          .input:focus { outline: none; border-color: var(--green); }
          .card {
            background: var(--white);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
          }
          .error { color: var(--red); font-size: 0.88rem; margin-top: 0.5rem; }
          .success { color: var(--green); font-size: 0.88rem; margin-top: 0.5rem; }
          .tag {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 600;
          }
          .tag-green { background: #e6f2ed; color: var(--green); }
          .tag-gold  { background: #fdf6e3; color: #9a7a1a; }
          .tag-red   { background: #fdeaea; color: var(--red); }
          .tag-gray  { background: #f0f0f0; color: var(--gray); }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          .fade-in { animation: fadeIn 0.35s ease both; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .pulse { animation: pulse 2s infinite; }

          /* Nav mobile */
          .nav-links { display: flex; align-items: center; gap: 1.5rem; }
          .nav-hamburger { display: none; background: transparent; border: none; cursor: pointer; padding: 4px 6px; color: #fff; font-size: 1.5rem; line-height: 1; }
          .nav-mobile-closed { display: none; }
          .nav-mobile-open { display: none; }

          /* Responsive helpers */
          .mobile-1col {}
          .mobile-2col {}
          .mobile-scroll {}
          .mobile-hide {}
          .mobile-stack {}
          .mobile-full {}

          @media (max-width: 640px) {
            .page { padding: 0 0.75rem 3rem; }
            .card { padding: 1rem; }

            /* Nav */
            .nav-links { display: none !important; }
            .nav-hamburger { display: block !important; }
            .nav-mobile-open {
              display: flex !important;
              flex-direction: column;
              position: fixed;
              top: 59px; left: 0; right: 0;
              background: var(--green);
              border-top: 2px solid var(--gold);
              padding: 0.5rem 1.25rem 1rem;
              z-index: 999;
              box-shadow: 0 6px 20px rgba(0,0,0,0.35);
            }
            .nav-mobile-open a {
              display: block !important;
              color: #fff !important;
              font-size: 1rem !important;
              opacity: 1 !important;
              padding: 0.8rem 0;
              border-bottom: 1px solid rgba(255,255,255,0.12);
              text-decoration: none !important;
            }
            .nav-mobile-open .nav-signout {
              display: block !important;
              width: 100%;
              text-align: left;
              background: transparent;
              border: none;
              border-bottom: 1px solid rgba(255,255,255,0.12);
              color: #fff;
              font-size: 1rem;
              padding: 0.8rem 0;
              cursor: pointer;
              font-family: 'Source Sans 3', sans-serif;
            }

            /* Layout helpers */
            .mobile-1col { grid-template-columns: 1fr !important; }
            .mobile-2col { grid-template-columns: 1fr 1fr !important; }
            .mobile-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
            .mobile-hide { display: none !important; }
            .mobile-stack { flex-direction: column !important; align-items: stretch !important; }
            .mobile-full { width: 100% !important; max-width: 100% !important; }
          }
        `}</style>
      </head>
      <body>
        <nav style={{
          background: 'var(--green)',
          borderBottom: '3px solid var(--gold)',
          padding: '0 1.25rem',
          position: 'relative',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <span style={{ fontSize: '1.4rem' }}>⛳</span>
              <span style={{ fontFamily: 'Playfair Display, serif', color: 'var(--gold)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                CC MASTERS POOL 2026
              </span>
            </a>
            <NavAuth />
          </div>
        </nav>
        <main>{children}</main>
        <SpeedInsights />
        <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray)', fontSize: '0.82rem', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
          Masters Pool 2026 · $20/entry · Max 3 entries
        </footer>
      </body>
    </html>
  )
}
