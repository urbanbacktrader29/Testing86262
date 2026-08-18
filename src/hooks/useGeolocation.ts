import { useEffect, useState } from "react";
import type { GeoPosition } from "../types";

interface GeoState {
  position: GeoPosition | null;
  error: string | null;
  supported: boolean;
}

export function useGeolocation(watch: boolean): GeoState {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    supported: typeof navigator !== "undefined" && "geolocation" in navigator,
  });

  useEffect(() => {
    if (!watch || !state.supported) return;

    const onSuccess = (pos: GeolocationPosition) => {
      setState((prev) => ({
        ...prev,
        error: null,
        position: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        },
      }));
    };

    const onError = (err: GeolocationPositionError) => {
      setState((prev) => ({ ...prev, error: err.message || "Standort nicht verfügbar." }));
    };

    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    });

    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch, state.supported]);

  return state;
}
