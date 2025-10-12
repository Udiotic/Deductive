// utils/html.js
export function extractFirstImgSrc(html = '') {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

export function extractAllImgSrcs(html = '') {
  return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
}
