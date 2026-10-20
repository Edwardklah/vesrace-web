import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge needs to know our custom type-scale utilities are font
 * sizes. Without this it assumes `text-body` is a colour and deletes
 * `text-primary-fg` (or vice versa) when both are on one element.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display",
            "h1",
            "h2",
            "h3",
            "body-lg",
            "body",
            "small",
            "caption",
            "overline",
          ],
        },
      ],
    },
  },
});

/**
 * Join class names and let later Tailwind classes win over earlier ones,
 * e.g. cn("px-4", isCompact && "px-2") -> "px-2".
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
