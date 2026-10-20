/** Tiny soft placeholder used as `blurDataURL` for remote images. */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e6ebf2"/></svg>')
    : Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e6ebf2"/></svg>').toString("base64"));
