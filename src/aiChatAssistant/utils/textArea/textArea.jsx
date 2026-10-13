import React, { useRef, useEffect } from 'react';
import './styles/desktop.css';

const MAX_HEIGHT = 180

const AutoResizeTextarea = ({ query, setQuery, sendMessage, disabled, placeholder }) => {
    const textareaRef = useRef(null);

    // Grows with its content up to MAX_HEIGHT, then scrolls
    useEffect(() => {
        const textarea = textareaRef.current
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
    }, [query]);

    return (
        <textarea
            className='chatTextarea'
            placeholder={placeholder}
            maxLength={800}
            rows={1}
            disabled={disabled}
            ref={textareaRef}
            value={query}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage();
                    e.preventDefault();
                }
            }}
            onChange={(e) => setQuery(e.target.value)}
        ></textarea>
    );
};

export default AutoResizeTextarea;
