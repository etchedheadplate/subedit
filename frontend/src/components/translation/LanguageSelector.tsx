import { useLanguage } from '../../hooks/useLanguage';

const LanguageSelector = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Select language"
        >
            <option value="en">English</option>
            <option value="ru">Русский</option>
        </select>
    );
};

export default LanguageSelector;
