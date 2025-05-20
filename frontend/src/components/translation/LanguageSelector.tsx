import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import LangLogo from "../../assets/switch_language.svg?react";
import '../../styles/MainHeader.css';

const LanguageSelector = () => {
    const { language, setLanguage } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const languageLabels: Record<string, string> = {
        en: "English",
        ru: "Русский",
        ko: "한국어",
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="custom-language-selector" ref={ref}>
            <button
                className="custom-language-button"
                onClick={() => setOpen(!open)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="language-icon-wrapper">
                    <LangLogo className="language-icon" />
                </span>
                <span>{languageLabels[language]}</span>
            </button>

            {open && (
                <ul className="custom-language-menu" role="listbox">
                    {Object.entries(languageLabels).map(([code, label]) => (
                        <li
                            key={code}
                            role="option"
                            onClick={() => {
                                setLanguage(code);
                                setOpen(false);
                            }}
                            className={`language-option ${code === language ? 'active' : ''}`}
                        >
                            {label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LanguageSelector;
