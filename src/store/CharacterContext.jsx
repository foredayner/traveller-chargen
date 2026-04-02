// ─────────────────────────────────────────────────────────────
//  CharacterContext.jsx
//  useCharacter 훅을 Context로 감싸 전역 접근 가능하게 합니다.
//  모든 Step 컴포넌트는 useCharacterContext()로 상태를 읽습니다.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext } from 'react'
import { useCharacter } from '../store/useCharacter.js'

const CharacterContext = createContext(null)

export function CharacterProvider({ children }) {
  const character = useCharacter()
  return (
    <CharacterContext.Provider value={character}>
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacterContext() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacterContext must be used inside <CharacterProvider>')
  return ctx
}
