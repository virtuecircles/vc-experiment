import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalLoading } from "./useGlobalLoading";

/**
 * Shows the global loading overlay during route transitions.
 * Fires startLoading on path change, stops after a brief tick
 * to let the new page mount.
 */
export const useRouteLoading = () => {
  const location = useLocation();
  const { startLoading, stopLoading } = useGlobalLoading();

  useEffect(() => {
    startLoading();
    // Give the new route a frame to mount, then clear
    const timer = setTimeout(() => stopLoading(), 100);
    return () => {
      clearTimeout(timer);
      stopLoading();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
};
