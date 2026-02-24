"use client";

import React, { createContext, useContext } from 'react';

type LangContextType = {
  lang: 'he' | 'en';
  dir: 'rtl' | 'ltr';
};

const LangContext = createContext<LangContextType | undefined>(undefined);

export const LangProvider = ({
  children,
  lang,
  dir
}: {
  children: React.ReactNode;
  lang: 'he' | 'en';
  dir: 'rtl' | 'ltr';
}) => {
  return (
    <LangContext.Provider value={{ lang, dir }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LangContext);
  if (context === undefined) {
    // ברירת מחדל לעברית כדי למנוע קריסות
    return { lang: 'he', dir: 'rtl' };
  }
  return context;
};
