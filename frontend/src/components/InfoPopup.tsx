import { useEffect, useRef, useState } from 'react';
import { apiService } from "../services/apiService";
import { useLanguage } from "../hooks/useLanguage";
import '../styles/MainHeader.css';

interface InfoPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Statistics {
    uploaded: number;
    downloaded: number;
    total: number;
    shifted: number;
    aligned: number;
    cleaned: number;
    translated: number;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ isOpen, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);

    // Get translation function from language context
    const { t } = useLanguage();

    const [statistics, setStatistics] = useState<Statistics | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        const loadStatistics = async () => {
            try {
                // Use the new API service method instead of direct fetch
                const data = await apiService.getStatistics();
                setStatistics(data);
            } catch (error) {
                console.error('Failed to load statistics:', error);
                // Provide fallback data that matches the new structure
                setStatistics({
                    uploaded: 0,
                    downloaded: 0,
                    total: 0,
                    shifted: 0,
                    aligned: 0,
                    cleaned: 0,
                    translated: 0,
                });
            }
        };

        if (isOpen) {
            loadStatistics();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="info-popup-overlay">
            <div className="info-popup" ref={popupRef}>
                <div className="info-popup-header">
                    <h3>About SubEdit</h3>
                    <button className="info-popup-close" onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className="info-popup-content">
                    <p>
                        SubEdit is a powerful subtitle editing tool that allows you to:
                    </p>
                    <ul>
                        {t('info.statistics')}
                        <li><strong>{t('info.filesUploaded')}</strong> {statistics?.uploaded || 0}</li>
                        <li><strong>{t('info.filesDownloaded')}</strong> {statistics?.downloaded || 0}</li>
                        <li><strong>{t('info.filesProcessed')}</strong> {statistics?.total || 0}</li>
                        <li><strong>{t('info.filesShifted')}</strong> {statistics?.shifted || 0}</li>
                        <li><strong>{t('info.filesAligned')}</strong> {statistics?.aligned || 0}</li>
                        <li><strong>{t('info.filesCleaned')}</strong> {statistics?.cleaned || 0}</li>
                        <li><strong>{t('info.filesTranslated')}</strong> {statistics?.translated || 0}</li>
                    </ul>
                    <p>
                        Simply upload your subtitle file and choose the operation you want to perform.
                        Your processed file will be available for download once the operation is complete.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InfoPopup;
