/** Prefix a path in public/ with the site base, so the page works at / and under /<repository>/ on GitHub Pages. */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${path.replace(/^\//, "")}`;
}
