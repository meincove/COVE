
// Basic color theme definitions for the UI
export const colorThemes: Record<string, string> = {
    black: "bg-gray-900 border-gray-700",
    white: "bg-white border-gray-200",
    gray: "bg-gray-400 border-gray-300",
    red: "bg-red-500 border-red-600",
    blue: "bg-blue-500 border-blue-600",
    green: "bg-green-500 border-green-600",
    yellow: "bg-yellow-400 border-yellow-500",
    purple: "bg-purple-500 border-purple-600",
    pink: "bg-pink-500 border-pink-600",
    orange: "bg-orange-500 border-orange-600",
    brown: "bg-amber-800 border-amber-900",
    beige: "bg-[#F5F5DC] border-[#E8E8C8]",
    default: "bg-slate-200 border-slate-300"
};

export const colorNameToThemeKey = (name?: string): string => {
    if (!name) return 'default';
    const n = name.toLowerCase();

    if (n.includes('black') || n.includes('dark')) return 'black';
    if (n.includes('white') || n.includes('light')) return 'white';
    if (n.includes('gray') || n.includes('grey') || n.includes('silver')) return 'gray';
    if (n.includes('red') || n.includes('maroon') || n.includes('crimson')) return 'red';
    if (n.includes('blue') || n.includes('navy') || n.includes('teal')) return 'blue';
    if (n.includes('green') || n.includes('olive') || n.includes('lime')) return 'green';
    if (n.includes('yellow') || n.includes('gold')) return 'yellow';
    if (n.includes('purple') || n.includes('violet') || n.includes('indigo')) return 'purple';
    if (n.includes('pink') || n.includes('rose') || n.includes('magenta')) return 'pink';
    if (n.includes('orange') || n.includes('coral')) return 'orange';
    if (n.includes('brown') || n.includes('tan') || n.includes('coffee')) return 'brown';
    if (n.includes('beige') || n.includes('cream')) return 'beige';

    return 'default';
};
