/** Recolors game-icons.net black SVGs to inherit the CSS `color` (currentColor). */
export const toCurrentColorIconSvg = (svg: string): string =>
    svg
        .replace(/fill="#000"/gi, 'fill="currentColor"')
        .replace(/fill="#000000"/gi, 'fill="currentColor"');
