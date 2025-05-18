import { createContext, useState, ReactNode } from 'react';
import translationData from '../../../../shared/translation.json';

type TranslationData = typeof translationData;

type LanguageContextType = {
    language: string;
    setLanguage: (lang: string) => void;
    t: (path: string) => string;
};

const defaultLanguage = 'en';

export const LanguageContext = createContext<LanguageContextType>({
    language: defaultLanguage,
    setLanguage: () => { },
    t: () => '',
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState(defaultLanguage);

    const t = (path: string): string => {
        try {
            const keys = path.split('.');
            let value: unknown = translationData[language as keyof TranslationData];

            for (const key of keys) {
                if (typeof value === 'object' && value !== null && key in value) {
                    value = (value as Record<string, unknown>)[key];
                } else {
                    return path;
                }
            }

            if (value === undefined && language !== 'en') {
                value = translationData.en;
                for (const key of keys) {
                    if (typeof value === 'object' && value !== null && key in value) {
                        value = (value as Record<string, unknown>)[key];
                    } else {
                        return path;
                    }
                }
            }

            return typeof value === 'string' ? value : path;
        } catch (error) {
            console.error(`Translation error for path: ${path}`, error);
            return path;
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
