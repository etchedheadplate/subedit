import { useContext } from 'react';
import { LanguageContext } from '../components/translation/LanguageContext';

export const useLanguage = () => useContext(LanguageContext);
