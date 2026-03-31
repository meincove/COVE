'use client';

import React from 'react';
import InfoPanel from '@/components/outfit-builder/InfoPanel';
import CanvasWorkspace from '@/components/outfit-builder/CanvasWorkspace';
import ChatInterface from '@/components/outfit-builder/ChatInterface';

import ResizableLayout from '@/components/outfit-builder/ResizableLayout';

export default function OutfitBuilderPage() {
    return (
        <ResizableLayout
            leftPanel={<InfoPanel />}
            centerPanel={<CanvasWorkspace />}
            rightPanel={<ChatInterface />}
        />
    );
}
