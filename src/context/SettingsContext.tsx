import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '@/i18n/translations';

interface SettingsContextType {
    language: Language;
    timezone: string;
    boardViewMode: 'all' | 'active';
    setLanguage: (lang: Language) => void;
    setTimezone: (tz: string) => void;
    setBoardViewMode: (mode: 'all' | 'active') => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('zigzup-language') as Language) || 'en';
    });

    const [timezone, setTimezoneState] = useState<string>(() => {
        return localStorage.getItem('zigzup-timezone') || 'Asia/Kolkata';
    });

    const [boardViewMode, setBoardViewModeState] = useState<'all' | 'active'>(() => {
        return (localStorage.getItem('zigzup-board-view-mode') as 'all' | 'active') || 'all';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('zigzup-language', lang);
    };

    const setTimezone = (tz: string) => {
        setTimezoneState(tz);
        localStorage.setItem('zigzup-timezone', tz);
    };

    const setBoardViewMode = (mode: 'all' | 'active') => {
        setBoardViewModeState(mode);
        localStorage.setItem('zigzup-board-view-mode', mode);
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <SettingsContext.Provider value={{
            language,
            timezone,
            boardViewMode,
            setLanguage,
            setTimezone,
            setBoardViewMode,
            t
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
