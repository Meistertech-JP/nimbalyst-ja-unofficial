import React from 'react';
/** Keep a rejected lazy import inside its dialog, so the workspace remains usable. */
export declare function DialogLoadBoundary({ children, onClose }: {
    children: React.ReactNode;
    onClose: () => void;
}): React.JSX.Element;
