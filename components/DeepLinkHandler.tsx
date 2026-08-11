'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // Only run on Capacitor (Native apps)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Handle Cold Start (App was completely closed and launched via URL)
    CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        handleDeepLink(launchUrl.url);
      }
    });

    // Handle Warm Start (App was in background and brought to foreground via URL)
    const listener = CapacitorApp.addListener('appUrlOpen', (event) => {
      if (event && event.url) {
        handleDeepLink(event.url);
      }
    });

    return () => {
      // Cleanup listener
      listener.then((l) => l.remove());
    };
  }, [router]);

  const handleDeepLink = (url: string) => {
    try {
      console.log('[DeepLinkHandler] Received URL:', url);

      // Extract path from URL
      let path = '';

      // Handle /job/{jobId} format (e.g. https://app.sentralogis.com/job/12345)
      let jobIndex = url.indexOf('/job/');
      if (jobIndex !== -1) {
        path = url.substring(jobIndex);
      }

      // Handle /jo/{token} format (e.g. https://www.sentralogis.com/jo/abc123)
      let joIndex = url.indexOf('/jo/');
      if (joIndex === -1) joIndex = url.indexOf('jo/');
      if (joIndex !== -1 && path === '') {
        path = url.substring(joIndex);
      }

      if (path !== '') {
        // Clean up hash fragments
        const hashIndex = path.indexOf('#');
        if (hashIndex !== -1) {
          path = path.substring(0, hashIndex);
        }

        // Ensure path starts with / for proper URL resolution
        if (!path.startsWith('/')) path = '/' + path;

        // Prevent infinite loop: only redirect if we are not already on this path
        if (window.location.pathname !== path) {
          console.log('[DeepLinkHandler] Redirecting to:', path);
          router.push(path); // USE SPA ROUTING TO PRESERVE CAPACITOR BRIDGE
        }
      }
    } catch (err) {
      console.error('[DeepLinkHandler] Error parsing deep link URL:', err);
    }
  };

  // This is a headless component, it renders nothing.
  return null;
}
