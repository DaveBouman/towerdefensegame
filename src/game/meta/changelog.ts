/** Player-facing patch notes for the main menu. Add entries here when you ship updates. */

export interface ChangelogEntry {
    /** ISO date `YYYY-MM-DD` — newest first. */
    date: string;
    title: string;
    /** One or more short paragraphs shown as a list item group. Wrap emphasis in **double asterisks**. */
    paragraphs: string[];
}

export const CHANGELOG: ChangelogEntry[] = [];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
});

export const formatChangelogDate = (isoDate: string): string =>
    dateFormatter.format(new Date(`${isoDate}T12:00:00`));
