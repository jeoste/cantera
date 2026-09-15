export function normalizeLinkedinUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("L’URL LinkedIn est obligatoire.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("URL LinkedIn invalide.");
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "linkedin.com") {
    throw new Error("L’URL doit être un profil linkedin.com.");
  }

  let path = url.pathname.toLowerCase().replace(/\/+$/, "");
  path = path.replace(/\/(en|fr|es|pt|de|it)$/, "");

  if (!path.startsWith("/in/")) {
    throw new Error("L’URL doit pointer vers un profil /in/…");
  }

  return `https://www.linkedin.com${path}`;
}

export function linkedinSlugFromUrl(normalizedUrl: string): string {
  const path = new URL(normalizedUrl).pathname.replace(/\/+$/, "");
  return path.replace(/^\/in\//, "");
}
