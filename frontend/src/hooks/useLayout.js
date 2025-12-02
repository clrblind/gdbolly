
import { useState, useRef } from 'react';

export const useLayout = () => {
    const [layout, setLayout] = useState({
        topHeightPercent: 65,
        leftWidthPercent: 65
    });

    const isDraggingHorz = useRef(false);
    const isDraggingVert = useRef(false);

    const handleMouseDownHorz = (e) => {
        e.preventDefault();
        isDraggingHorz.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDownVert = (e) => {
        e.preventDefault();
        isDraggingVert.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (isDraggingHorz.current) {
            const h = (e.clientY / window.innerHeight) * 100;
            setLayout(prev => ({ ...prev, topHeightPercent: Math.max(10, Math.min(90, h)) }));
        }
        if (isDraggingVert.current) {
            const w = (e.clientX / window.innerWidth) * 100;
            setLayout(prev => ({ ...prev, leftWidthPercent: Math.max(10, Math.min(90, w)) }));
        }
    };

    const handleMouseUp = () => {
        isDraggingHorz.current = false;
        isDraggingVert.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    return {
        layout,
        handleMouseDownHorz,
        handleMouseDownVert
    };
};
