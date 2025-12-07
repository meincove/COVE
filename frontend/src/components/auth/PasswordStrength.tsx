'use client'

interface PasswordStrengthProps {
    strength: number
}

export default function PasswordStrength({ strength }: PasswordStrengthProps) {
    const getStrengthLabel = () => {
        if (strength < 25) return 'Weak'
        if (strength < 50) return 'Fair'
        if (strength < 75) return 'Good'
        return 'Strong'
    }

    const getStrengthColor = () => {
        if (strength < 25) return 'bg-red-500'
        if (strength < 50) return 'bg-orange-500'
        if (strength < 75) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    return (
        <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Password strength</span>
                <span className={`text-xs font-semibold ${strength < 25 ? 'text-red-500' :
                        strength < 50 ? 'text-orange-500' :
                            strength < 75 ? 'text-yellow-500' :
                                'text-green-500'
                    }`}>
                    {getStrengthLabel()}
                </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${strength}%` }}
                />
            </div>
            <div className="mt-1 text-xs text-gray-500">
                {strength < 50 && (
                    <span>Use 8+ characters with mix of letters, numbers & symbols</span>
                )}
            </div>
        </div>
    )
}
