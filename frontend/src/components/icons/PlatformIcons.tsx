import React from 'react'

interface IconProps {
    color?: string
    size?: number
    strokeWidth?: number
    className?: string
}

export const LaptopIcon: React.FC<IconProps> = ({
    color = 'currentColor',
    size = 64,
    strokeWidth = 1.5,
    className = ''
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="17" x2="22" y2="17" />
        <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
)

export const DollarIcon: React.FC<IconProps> = ({
    color = 'currentColor',
    size = 64,
    strokeWidth = 1.5,
    className = ''
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
)

export const RobotIcon: React.FC<IconProps> = ({
    color = 'currentColor',
    size = 64,
    strokeWidth = 1.5,
    className = ''
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <rect x="5" y="7" width="14" height="12" rx="2" />
        <path d="M12 7V4" />
        <circle cx="9" cy="11" r="1" />
        <circle cx="15" cy="11" r="1" />
        <path d="M9 15h6" />
        <path d="M5 13h-2" />
        <path d="M21 13h-2" />
    </svg>
)
