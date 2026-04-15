import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // Disable browser's automatic scroll restoration
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (hash) {
      // For anchor links: scroll to top first, then smooth-scroll to the section
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const timeout = setTimeout(() => {
        const el = document.getElementById(hash.substring(1));
        if (el) {
          const headerOffset = 80;
          const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timeout);
    } else {
      // For all route changes (including back/forward), reset to top
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  return null;
};
