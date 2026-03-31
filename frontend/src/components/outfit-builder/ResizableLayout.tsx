'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ResizableLayoutProps {
    leftPanel: React.ReactNode;
    centerPanel: React.ReactNode;
    rightPanel: React.ReactNode;
}

export default function ResizableLayout({ leftPanel, centerPanel, rightPanel }: ResizableLayoutProps) {
    // Initial widths in percentage or pixels. Using pixels for stability.
    const [leftWidth, setLeftWidth] = useState(350);
    const [rightWidth, setRightWidth] = useState(400);

    const containerRef = useRef<HTMLDivElement>(null);
    const isResizingLeft = useRef(false);
    const isResizingRight = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const bounds = containerRef.current.getBoundingClientRect();

            if (isResizingLeft.current) {
                const newWidth = e.clientX - bounds.left;
                if (newWidth > 250 && newWidth < 600) { // Min/Max constraints
                    setLeftWidth(newWidth);
                }
            }

            if (isResizingRight.current) {
                const newWidth = bounds.right - e.clientX;
                if (newWidth > 300 && newWidth < 600) { // Min/Max constraints
                    setRightWidth(newWidth);
                }
            }
        };

        const handleMouseUp = () => {
            isResizingLeft.current = false;
            isResizingRight.current = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto'; // Re-enable selection
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Strict scroll lock for the page
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    const startResizingLeft = () => {
        isResizingLeft.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Prevent selection while dragging
    };

    const startResizingRight = () => {
        isResizingRight.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    return (
        <div ref={containerRef} className="fixed inset-0 z-[100] flex h-[100dvh] w-full overflow-hidden bg-gray-50 overscroll-none">

            {/* Left Panel */}
            <div style={{ width: leftWidth }} className="flex-shrink-0 h-full relative z-20 shadow-xl bg-white">
                {leftPanel}

                {/* Left Splitter */}
                <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50 flex items-center justify-center opacity-0 hover:opacity-100 group"
                    onMouseDown={startResizingLeft}
                >
                    <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-white" />
                </div>
            </div>

            {/* Center Panel (Canvas) */}
            <div className="flex-1 h-full min-w-0 z-10 relative">
                {centerPanel}
            </div>

            {/* Right Panel */}
            <div style={{ width: rightWidth }} className="flex-shrink-0 h-full relative z-20 bg-transparent pointer-events-none">
                {/* Right Splitter (Positioned on the left of this panel) */}
                <div
                    className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-50 -ml-1 flex items-center justify-center opacity-0 hover:opacity-100 group pointer-events-auto"
                    onMouseDown={startResizingRight}
                >
                    <div className="w-1 h-8 bg-gray-300 rounded-full group-hover:bg-white" />
                </div>

                <div className="h-full w-full pointer-events-auto">
                    {rightPanel}
                </div>
            </div>

        </div>
    );
}
