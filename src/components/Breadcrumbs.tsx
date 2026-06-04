import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";

/** Human-friendly labels for known route segments. */
const LABELS: Record<string, string> = {
  auth: "Sign In",
  "reset-password": "Reset Password",
  "quiz-intro": "Quiz",
  quiz: "Quiz",
  "quiz-results": "Results",
  dashboard: "Dashboard",
  admin: "Admin",
  plans: "Plans",
  aristotle: "About Virtue",
  events: "Meetups",
  "circle-stories": "Circle Stories",
  soulmatch: "SoulMatch",
  "founding-100": "Founding 100",
  contact: "Contact",
  legal: "Legal",
  privacy: "Privacy Policy",
  terms: "Terms of Use",
  "code-of-conduct": "Code of Conduct",
  waiver: "Waiver",
  "become-guide": "Become a Guide",
  "become-partner": "Become a Partner",
  blog: "Blog",
  "how-it-works": "How It Works",
};

const humanize = (slug: string) =>
  decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const Breadcrumbs = () => {
  const location = useLocation();
  const params = useParams();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    // If segment is a dynamic param value, prefer a humanized version
    const isDynamic = Object.values(params).includes(seg);
    const label = !isDynamic && LABELS[seg] ? LABELS[seg] : humanize(seg);
    return { path, label, isLast: i === segments.length - 1 };
  });

  // JSON-LD BreadcrumbList
  useEffect(() => {
    const origin = window.location.origin;
    const items = [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      ...crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.label,
        item: `${origin}${c.path}`,
      })),
    ];
    const ld = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    };
    const scriptId = "breadcrumb-jsonld";
    let tag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!tag) {
      tag = document.createElement("script");
      tag.id = scriptId;
      tag.type = "application/ld+json";
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(ld);
    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [location.pathname]);

  return (
    <nav aria-label="Breadcrumb" className="border-b border-border/30 bg-background/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
          <li className="inline-flex items-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Home</span>
            </Link>
          </li>
          {crumbs.map((c) => (
            <li key={c.path} className="inline-flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60" aria-hidden="true" />
              {c.isLast ? (
                <span
                  aria-current="page"
                  className="text-foreground text-primary font-medium truncate max-w-[60vw] sm:max-w-none"
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  to={c.path}
                  className="hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded truncate max-w-[40vw] sm:max-w-none"
                >
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
};
