interface CraftpixIconProps {
    src: string;
    className?: string;
}

/**
 * Renders a white Craftpix PNG as a currentColor mask so React UI can tint icons.
 */
export const CraftpixIcon = ({ src, className }: CraftpixIconProps) => (
    <span
        className={[ 'craftpix-icon', className ].filter(Boolean).join(' ')}
        aria-hidden="true"
        style={{
            backgroundColor: 'currentColor',
            WebkitMaskImage: `url(${src})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: `url(${src})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
        }}
    />
);
