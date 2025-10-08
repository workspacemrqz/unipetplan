import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Component that automatically scrolls to the top of the page
 * whenever the route changes
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Scroll to top when location changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
  }, [location]);

  return null;
}
