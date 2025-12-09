import React from 'react'

interface IconProps {
    color?: string
    size?: number
    strokeWidth?: number
    className?: string
}

export const ShoppingCartIcon: React.FC<IconProps> = ({
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
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
)

export const TShirtIcon: React.FC<IconProps> = ({
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
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
    </svg>
)

export const HangerIcon: React.FC<IconProps> = ({
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
        <path d="M12 2a3 3 0 0 0-3 3v1" />
        <path d="M12 6v6" />
        <path d="M3 18h18" />
        <path d="M3 18l9-6 9 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z" />
    </svg>
)
