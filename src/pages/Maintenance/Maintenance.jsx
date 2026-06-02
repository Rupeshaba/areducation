import { useState } from 'react'

export default function Maintenance() {
  const [message] = useState(
    sessionStorage.getItem('maintenanceMessage') || 'We are upgrading our systems to serve you better. Please check back soon.'
  )
  const [dots, setDots] = useState('')
  const [progress, setProgress] = useState(0)

  // ── FIXED: Removed auto-polling that was causing redirect loops
  // Instead: Show maintenance page, user can manually refresh
  // When admin turns off maintenance, user's next API call will work
  // and they'll be redirected back automatically by axios interceptor

  // Just animate the dots and progress bar
  const dotsInterval = setInterval(() => {
    setDots(d => d.length >= 3 ? '' : d + '.')
  }, 500)

  let p = 0
  const progressInterval = setInterval(() => {
    p += Math.random() * 1.5
    if (p >= 100) p = 0
    setProgress(Math.min(p, 100))
  }, 80)

  // Cleanup intervals on unmount
  return () => {
    clearInterval(dotsInterval)
    clearInterval(progressInterval)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{
        background: '#0a0a1a',
        backgroundImage: `
          radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.10) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.07) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.06) 0%, transparent 60%)
        `,
      }}
    >
      <div style={{ position: 'fixed', top: '15%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', animation: 'float1 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '10%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', animation: 'float2 10s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

      <div style={{ animation: 'slideUp 0.6s ease-out both', position: 'relative', zIndex: 1, width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', width: 88, height: 88, borderRadius: 24, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'iconPulse 2s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: 32, border: '1px solid rgba(99,102,241,0.12)', animation: 'ringExpand 2s ease-in-out infinite' }} />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
        </div>

        <div style={{ background: 'rgba(18,18,42,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: '40px 36px', boxShadow: '0 0 60px rgba(99,102,241,0.08), 0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 100, padding: '4px 14px', marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'blink 1s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Sora, system-ui, sans-serif' }}>System Maintenance</span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 12, lineHeight: 1.3, fontFamily: 'Sora, system-ui, sans-serif' }}>
            We'll be back shortly{dots}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(156,163,175,0.9)', lineHeight: 1.7, marginBottom: 32, fontFamily: 'Sora, system-ui, sans-serif' }}>{message}</p>

          <div style={{ marginBottom: 28 }}>
            <div style={{ height: 4, borderRadius: 100, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #6366f1, #818cf8)', width: `${progress}%`, transition: 'width 0.08s linear', boxShadow: '0 0 12px rgba(99,102,241,0.6)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(129,140,248,0.6)', marginTop: 8, fontFamily: 'Sora, system-ui, sans-serif' }}>Maintenance in progress • Click refresh to check status</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {[
              { label: 'Database optimization', done: true },
              { label: 'System upgrades', done: true },
              { label: 'Final checks & deployment', done: false },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${step.done ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 12, animation: `slideUp 0.5s ease-out ${0.1 * i + 0.3}s both` }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.done ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${step.done ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                  {step.done ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', animation: 'blink 1.4s ease-in-out infinite' }} />
                  )}
                </div>
                <span style={{ fontSize: 13, color: step.done ? 'rgba(129,140,248,0.8)' : 'rgba(156,163,175,0.5)', fontFamily: 'Sora, system-ui, sans-serif', fontWeight: step.done ? 500 : 400 }}>{step.label}</span>
                {step.done && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(99,102,241,0.6)', fontFamily: 'Sora, system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.05em' }}>DONE</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 28,
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Sora, system-ui, sans-serif',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 6px 30px rgba(99,102,241,0.5)'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            🔄 Check Status
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(107,114,128,0.7)', fontFamily: 'Sora, system-ui, sans-serif' }}>AR Education • Thank you for your patience</p>
      </div>

      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0)scale(1)} 50%{transform:translateY(-30px)scale(1.05)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)scale(1)} 50%{transform:translateY(25px)scale(0.95)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes iconPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.15)} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0)} }
        @keyframes ringExpand { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.1;transform:scale(1.08)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
