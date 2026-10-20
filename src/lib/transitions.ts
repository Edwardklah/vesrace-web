/**
 * Shared view-transition names. A card photo and the event page hero use the
 * same name, so React morphs one into the other when you open the event.
 * Names must be unique on a page at any moment.
 */
export const eventMediaName = (id: string) => `event-media-${id}`;
