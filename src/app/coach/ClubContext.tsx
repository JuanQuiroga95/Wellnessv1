'use client'

import React, { createContext, useContext } from 'react'

interface ClubContextType {
  deporte: string
}

const ClubContext = createContext<ClubContextType>({
  deporte: 'FUTBOL'
})

export function useClubContext() {
  return useContext(ClubContext)
}

export function ClubProvider({ deporte, children }: { deporte: string, children: React.ReactNode }) {
  return (
    <ClubContext.Provider value={{ deporte }}>
      {children}
    </ClubContext.Provider>
  )
}
