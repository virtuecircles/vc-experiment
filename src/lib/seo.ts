/**
 * Lightweight SEO helpers for SPA pages.
 * Updates document title and meta description without a third-party lib.
 */

const DEFAULT_TITLE = "Virtue Circles — Where Character Creates Connection";
const DEFAULT_DESCRIPTION =
  "Virtue Circles helps you build deep friendships rooted in character, wisdom, and shared virtue.";

function upsertMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertOg(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

export interface PageMeta {
  title: string;
  description?: string;
  image?: string;
  canonicalPath?: string;
}

export function setPageMeta({ title, description, image, canonicalPath }: PageMeta) {
  document.title = title.length > 60 ? title.slice(0, 57) + "..." : title;

  const desc = (description ?? DEFAULT_DESCRIPTION).slice(0, 158);
  upsertMeta("description", desc);

  upsertOg("og:title", title);
  upsertOg("og:description", desc);
  upsertOg("og:type", "article");
  if (image) upsertOg("og:image", image);

  if (canonicalPath) {
    upsertCanonical(`${window.location.origin}${canonicalPath}`);
  }
}

export function resetPageMeta() {
  document.title = DEFAULT_TITLE;
  upsertMeta("description", DEFAULT_DESCRIPTION);
}
