import { useEffect, useRef } from 'react';
import '../styles/MainHeader.css';

interface InfoPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ isOpen, onClose }) => {
    const popupRef = useRef<HTMLDivElement>(null);

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
                        <li><strong>Shift:</strong> Adjust timing of all subtitles by a specific amount</li>
                        <li><strong>Align:</strong> Synchronize subtitles with audio/video content</li>
                        <li><strong>Clean:</strong> Remove unwanted characters and format text</li>
                        <li><strong>Translate:</strong> Convert subtitles to different languages</li>
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
