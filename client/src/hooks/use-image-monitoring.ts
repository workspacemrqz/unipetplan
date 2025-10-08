import { useState, useEffect, useCallback } from 'react';

interface ImageLoadEvent {
  url: string;
  success: boolean;
  loadTime?: number;
  error?: string;
  timestamp: Date;
}

interface ImageMonitoringStats {
  total: number;
  successful: number;
  failed: number;
  averageLoadTime: number;
  lastError?: string;
}

export const useImageMonitoring = () => {
  const [events, setEvents] = useState<ImageLoadEvent[]>([]);
  const [stats, setStats] = useState<ImageMonitoringStats>({
    total: 0,
    successful: 0,
    failed: 0,
    averageLoadTime: 0
  });

  const recordImageEvent = useCallback((event: ImageLoadEvent) => {
    setEvents(prev => [...prev, event]);
    
    // Update stats
    setStats(prev => {
      const newTotal = prev.total + 1;
      const newSuccessful = prev.successful + (event.success ? 1 : 0);
      const newFailed = prev.failed + (event.success ? 0 : 1);
      
      let newAverageLoadTime = prev.averageLoadTime;
      if (event.loadTime) {
        newAverageLoadTime = (prev.averageLoadTime * prev.successful + event.loadTime) / newSuccessful;
      }
      
      return {
        total: newTotal,
        successful: newSuccessful,
        failed: newFailed,
        averageLoadTime: newAverageLoadTime,
        lastError: event.success ? prev.lastError : event.error
      };
    });
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setStats({
      total: 0,
      successful: 0,
      failed: 0,
      averageLoadTime: 0
    });
  }, []);

  const getFailedImages = useCallback(() => {
    return events.filter(event => !event.success);
  }, [events]);

  const getSlowImages = useCallback((thresholdMs: number = 3000) => {
    return events.filter(event => event.success && event.loadTime && event.loadTime > thresholdMs);
  }, [events]);

  // Log errors to console
  useEffect(() => {
    const failedImages = getFailedImages();
    if (failedImages.length > 0) {
      console.group('🚨 Image Loading Failures Detected');
      failedImages.forEach(event => {
        console.error(`Failed to load: ${event.url}`, {
          error: event.error,
          timestamp: event.timestamp
        });
      });
      console.groupEnd();
    }
  }, [getFailedImages]);

  // Log performance issues
  useEffect(() => {
    const slowImages = getSlowImages();
    if (slowImages.length > 0) {
      console.warn('🐌 Slow Image Loading Detected', {
        count: slowImages.length,
        images: slowImages.map(event => ({
          url: event.url,
          loadTime: event.loadTime
        }))
      });
    }
  }, [getSlowImages]);

  return {
    events,
    stats,
    recordImageEvent,
    clearEvents,
    getFailedImages,
    getSlowImages
  };
};

export default useImageMonitoring;
