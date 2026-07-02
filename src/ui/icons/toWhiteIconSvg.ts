/** Makes game-icons.net black SVGs readable on dark UI backgrounds. */
export const toWhiteIconSvg = (svg: string): string =>
    svg
        .replace(/fill="#000"/gi, 'fill="#ffffff"')
        .replace(/fill="#000000"/gi, 'fill="#ffffff"');
