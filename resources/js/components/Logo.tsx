interface LogoProps {
    className?: string;
    width?: number;
    height?: number;
    variant?: 'auto' | 'light' | 'dark';
    fill?: boolean;
    kind?: 'full' | 'mark';
}

export default function Logo({
    className = '',
    width = 200,
    height = 50,
    variant = 'auto',
    fill = false,
    kind = 'full',
}: LogoProps) {
    const baseClasses = 'transition-all duration-200';

    const variantClasses = {
        auto: 'dark:invert dark:hue-rotate-[180deg] dark:brightness-110',
        light: '',
        dark: 'invert hue-rotate-[180deg] brightness-110',
    };

    const sizeClasses = fill ? 'w-full h-full object-contain' : '';

    const imgProps: React.ImgHTMLAttributes<HTMLImageElement> = {
        src: kind === 'mark' ? '/favicon.svg' : '/logo.svg',
        alt: 'App Logo',
        className:
            `${baseClasses} ${variantClasses[variant]} ${sizeClasses} ${className}`.trim(),
    };

    if (!fill) {
        imgProps.width = width;
        imgProps.height = height;
        (imgProps as any).style = {
            width: `${width}px`,
            height: `${height}px`,
        };
    }

    return <img {...imgProps} />;
}
