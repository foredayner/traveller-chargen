// ─────────────────────────────────────────────────────────────
//  CharacterSlotScreen.jsx — 캐릭터 슬롯 선택/관리 화면
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { listCharacters, deleteCharacter } from '../supabase'

const SLOT_COUNT = 5

export default function CharacterSlotScreen({ user, onSelect, onLogout }) {
  const [chars,   setChars]   = useState([])
  const [loading, setLoading] = useState(true)
  const [delConfirm, setDelConfirm] = useState(null)  // slot number

  const load = async () => {
    setLoading(true)
    try {
      const list = await listCharacters(user.key)
      setChars(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (slot) => {
    try {
      await deleteCharacter(user.key, slot)
      setDelConfirm(null)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const getChar = (slot) => chars.find(c => c.slot === slot)

  return (
    <div style={{
      minHeight:'100vh', background:'var(--col-bg)',
      backgroundImage:'radial-gradient(ellipse at 50% 20%, rgba(200,168,75,0.04) 0%, transparent 60%)',
    }}>
      {/* 헤더 */}
      <div style={{
        borderBottom:'1px solid var(--col-border)',
        padding:'1rem 1.5rem',
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <div>
          <div style={{
            fontFamily:'var(--font-display)', fontSize:'1.1rem',
            color:'var(--col-gold)', letterSpacing:'0.1em',
          }}>TRAVELLER</div>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:'0.65rem',
            color:'var(--col-text-muted)', marginTop:'1px',
          }}>
            ✦ {user.nickname}님의 여행자들
          </div>
        </div>
        <button className="btn btn-ghost" onClick={onLogout} style={{ fontSize:'0.8rem' }}>
          로그아웃
        </button>
      </div>

      {/* 슬롯 그리드 */}
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'2rem 1.5rem' }}>
        <div style={{ marginBottom:'1.5rem' }}>
          <h2 style={{
            fontFamily:'var(--font-display)', fontSize:'1.1rem',
            color:'var(--col-text)', marginBottom:'0.25rem',
          }}>캐릭터 슬롯</h2>
          <p style={{ fontSize:'0.78rem', color:'var(--col-text-muted)' }}>
            최대 5명의 여행자를 저장할 수 있습니다.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--col-text-muted)', fontFamily:'var(--font-mono)', fontSize:'0.8rem' }}>
            불러오는 중...
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).map(slot => {
              const char = getChar(slot)
              const isEmpty = !char

              return (
                <div key={slot} style={{
                  border:`1px solid ${isEmpty ? 'var(--col-border)' : 'var(--col-gold-dim)'}`,
                  borderRadius:'var(--radius-lg)',
                  padding:'1rem 1.25rem',
                  background: isEmpty ? 'transparent' : 'rgba(200,168,75,0.03)',
                  display:'flex', alignItems:'center', gap:'1rem',
                  transition:'all 0.15s',
                }}>
                  {/* 슬롯 번호 */}
                  <div style={{
                    width:'36px', height:'36px',
                    border:`1px solid ${isEmpty ? 'var(--col-border)' : 'var(--col-gold)'}`,
                    borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-mono)', fontSize:'0.8rem',
                    color: isEmpty ? 'var(--col-text-dim)' : 'var(--col-gold)',
                    flexShrink:0,
                  }}>
                    {slot}
                  </div>

                  {/* 캐릭터 정보 */}
                  <div style={{ flex:1, minWidth:0 }}>
                    {isEmpty ? (
                      <div style={{ fontSize:'0.82rem', color:'var(--col-text-dim)' }}>
                        빈 슬롯
                      </div>
                    ) : (
                      <>
                        <div style={{
                          fontFamily:'var(--font-display)', fontSize:'1rem',
                          color:'var(--col-text)', marginBottom:'2px',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        }}>
                          {char.name}
                        </div>
                        <div style={{
                          fontFamily:'var(--font-mono)', fontSize:'0.65rem',
                          color:'var(--col-text-muted)', display:'flex', gap:'1rem',
                        }}>
                          <span>UPP {char.upp || '??????'}</span>
                          <span>나이 {char.age}세</span>
                          <span>경력 {char.careers}주기</span>
                          {char.savedAt?.seconds && (
                            <span style={{ color:'var(--col-text-dim)' }}>
                              {new Date(char.savedAt.seconds * 1000).toLocaleDateString('ko-KR')} 저장
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                    {isEmpty ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => onSelect({ slot, mode:'new' })}
                        style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }}
                      >
                        + 새 캐릭터
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => onSelect({ slot, mode:'load' })}
                          style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }}
                        >
                          이어하기
                        </button>
                        {delConfirm === slot ? (
                          <>
                            <button
                              className="btn"
                              onClick={() => handleDelete(slot)}
                              style={{
                                fontSize:'0.8rem', padding:'0.4rem 0.9rem',
                                background:'rgba(224,82,82,0.12)',
                                borderColor:'var(--col-red)', color:'var(--col-red)',
                              }}
                            >
                              확인 삭제
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => setDelConfirm(null)}
                              style={{ fontSize:'0.8rem', padding:'0.4rem 0.9rem' }}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={() => setDelConfirm(slot)}
                            style={{ fontSize:'0.8rem', padding:'0.4rem 0.7rem', color:'var(--col-text-dim)' }}
                          >
                            🗑
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 삭제 확인 오버레이 */}
        {delConfirm && (
          <div style={{
            marginTop:'1rem', padding:'0.75rem 1rem',
            background:'rgba(224,82,82,0.07)', border:'1px solid rgba(224,82,82,0.3)',
            borderRadius:'var(--radius-md)', fontSize:'0.8rem', color:'var(--col-red)',
          }}>
            슬롯 {delConfirm}의 캐릭터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
