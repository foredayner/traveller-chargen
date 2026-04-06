// ─────────────────────────────────────────────────────────────
//  AuthScreen.jsx — 닉네임 + PIN 로그인/회원가입 화면
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { registerUser, loginUser } from '../supabase'

export default function AuthScreen({ onLogin }) {
  const [mode,     setMode]     = useState('login')   // 'login' | 'register'
  const [nickname, setNickname] = useState('')
  const [pin,      setPin]      = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!nickname.trim()) return setError('닉네임을 입력하세요.')
    if (!pin)             return setError('PIN을 입력하세요.')

    setLoading(true)
    try {
      if (mode === 'register') {
        if (pin !== pinConfirm) throw new Error('PIN이 일치하지 않습니다.')
        await registerUser(nickname, pin)
      }
      const user = await loginUser(nickname, pin)
      // 로그인 정보 sessionStorage에 저장 (탭 닫으면 로그아웃)
      sessionStorage.setItem('traveller_user', JSON.stringify(user))
      onLogin(user)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--col-bg)',
      backgroundImage:'radial-gradient(ellipse at 50% 30%, rgba(200,168,75,0.04) 0%, transparent 70%)',
    }}>
      <div style={{ width:'100%', maxWidth:'400px', padding:'0 1.5rem' }}>
        {/* 로고 */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{
            fontFamily:'var(--font-display)', fontSize:'1.6rem',
            color:'var(--col-gold)', letterSpacing:'0.15em', marginBottom:'0.25rem',
          }}>
            TRAVELLER
          </div>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.7rem',
            color:'var(--col-text-muted)', letterSpacing:'0.2em',
          }}>
            CHARACTER GENERATION SYSTEM
          </div>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.62rem',
            color:'var(--col-text-dim)', marginTop:'0.25rem',
          }}>
            한국어 트래블러 캐릭터 생성 툴
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display:'flex', marginBottom:'1.5rem', gap:'0.5rem' }}>
          {[['login','로그인'],['register','새 계정']].map(([m,label]) => (
            <button key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex:1, padding:'0.6rem',
                fontFamily:'var(--font-body)', fontSize:'0.88rem',
                border:`1.5px solid ${mode===m ? 'var(--col-gold)' : 'var(--col-border)'}`,
                borderRadius:'var(--radius-md)',
                background: mode===m ? 'rgba(200,168,75,0.08)' : 'transparent',
                color: mode===m ? 'var(--col-gold)' : 'var(--col-text-muted)',
                cursor:'pointer', transition:'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <div className="card" style={{ padding:'1.5rem' }}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{
              display:'block', fontFamily:'var(--font-mono)', fontSize:'0.65rem',
              color:'var(--col-text-muted)', letterSpacing:'0.1em', marginBottom:'0.4rem',
            }}>닉네임</label>
            <input
              type="text" value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="2~20자, 한글/영문/숫자"
              maxLength={20}
              style={{ width:'100%', boxSizing:'border-box' }}
            />
          </div>

          <div style={{ marginBottom: mode==='register' ? '1rem' : '1.5rem' }}>
            <label style={{
              display:'block', fontFamily:'var(--font-mono)', fontSize:'0.65rem',
              color:'var(--col-text-muted)', letterSpacing:'0.1em', marginBottom:'0.4rem',
            }}>PIN (4자리 숫자)</label>
            <input
              type="password" value={pin} inputMode="numeric"
              onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="●●●●"
              maxLength={4}
              style={{ width:'100%', boxSizing:'border-box', letterSpacing:'0.3em' }}
            />
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom:'1.5rem' }}>
              <label style={{
                display:'block', fontFamily:'var(--font-mono)', fontSize:'0.65rem',
                color:'var(--col-text-muted)', letterSpacing:'0.1em', marginBottom:'0.4rem',
              }}>PIN 확인</label>
              <input
                type="password" value={pinConfirm} inputMode="numeric"
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,4))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="●●●●"
                maxLength={4}
                style={{ width:'100%', boxSizing:'border-box', letterSpacing:'0.3em' }}
              />
            </div>
          )}

          {error && (
            <div style={{
              padding:'0.5rem 0.75rem', marginBottom:'1rem',
              background:'rgba(224,82,82,0.08)', border:'1px solid rgba(224,82,82,0.3)',
              borderRadius:'var(--radius-sm)', fontSize:'0.8rem', color:'var(--col-red)',
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width:'100%' }}
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '계정 만들기'}
          </button>
        </div>

        {/* 안내 */}
        <div style={{
          marginTop:'1rem', fontSize:'0.72rem', color:'var(--col-text-dim)',
          textAlign:'center', lineHeight:1.6,
        }}>
          닉네임과 PIN은 캐릭터 시트 접근에만 사용됩니다.<br />
          PIN을 잃어버리면 복구할 수 없습니다.
        </div>
      </div>
    </div>
  )
}
