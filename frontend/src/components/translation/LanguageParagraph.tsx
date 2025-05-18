import React, { ReactNode } from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export const TranslatedParagraph = ({
    path,
    components
}: {
    path: string,
    components?: Record<string, ReactNode>
}) => {
    const { t } = useLanguage();
    const text = t(path);

    // If no dynamic components are passed, render as plain paragraph
    if (!components) return <p>{text}</p>;

    const processTemplate = (
        template: string,
        components: Record<string, ReactNode>
    ): ReactNode[] => {
        const regex = /\{(\w+)\}([\s\S]*?)\{\/\1\}/g;
        const result: ReactNode[] = [];

        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(template)) !== null) {
            const [, tagName, innerText] = match;
            const start = match.index;

            // Push any plain text before this match
            if (start > lastIndex) {
                result.push(template.slice(lastIndex, start));
            }

            const component = components[tagName];

            if (React.isValidElement(component)) {
                // Clone the component and insert innerText as its children
                result.push(React.cloneElement(component, {}, innerText));
            } else {
                // If no matching component, render fallback plain text
                result.push(innerText);
            }

            lastIndex = regex.lastIndex;
        }

        // Push remaining plain text after the last tag
        if (lastIndex < template.length) {
            result.push(template.slice(lastIndex));
        }

        return result;
    };

    return <p>{processTemplate(text, components)}</p>;
};
