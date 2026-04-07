'use client';

import * as React from 'react';
import { track, type AnalyticsEvent } from '@/lib/analytics';

type EventName = AnalyticsEvent['name'];
type EventData<N extends EventName> = Extract<AnalyticsEvent, { name: N }>['data'];

interface AnalyticsTrackerProps<N extends EventName> {
  event: N;
  data?: EventData<N>;
}

/**
 * Fires a single analytics event on mount.
 * Used from server components to emit client-side page view events.
 *
 * Example:
 *   <AnalyticsTracker event="landing_viewed" />
 *   <AnalyticsTracker event="pricing_viewed" />
 */
export function AnalyticsTracker<N extends EventName>({ event, data }: AnalyticsTrackerProps<N>) {
  const firedRef = React.useRef(false);
  React.useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    // The cast is safe: AnalyticsTrackerProps constrains data to the matching type.
    (track as (name: N, data?: EventData<N>) => void)(event, data);
  }, [event, data]);
  return null;
}
