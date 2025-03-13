import React from "react";
import { SubtitlePreview as SubtitlePreviewType } from "../../types";

interface SubtitlePreviewProps {
    preview: SubtitlePreviewType | null;
}

const SubtitlePreview: React.FC<SubtitlePreviewProps> = ({ preview }) => {
    if (!preview) return <p>No preview available</p>;

    return (
        <div className="subtitle-preview">
            <pre>
                {Object.entries(preview).map(([index, subtitle]) => (
                    <div key={index} className="subtitle-entry">
                        <div>{index}</div>
                        <div>
                            {subtitle.start} -- {subtitle.end}
                        </div>
                        <div>{subtitle.text}</div>
                        <br />
                    </div>
                ))}
            </pre>
        </div>
    );
};

export default SubtitlePreview;
