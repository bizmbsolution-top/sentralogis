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
      
      // Handle both /jo/ and jo/ (for custom scheme sentralogis://jo/token)
      let joIndex = url.indexOf('/jo/');
      if (joIndex === -1) joIndex = url.indexOf('jo/');
      if (joIndex !== -1) {
        // Extract everything from /jo/ onwards (including query params if any, until a hash)
        let path = url.substring(joIndex);
        const hashIndex = path.indexOf('#');
        if (hashIndex !== -1) {
          path = path.substring(0, hashIndex);
        }

        // Ensure path starts with / for proper URL resolution
        if (!path.startsWith('/')) path = '/' + path;

        // Prevent infinite loop: only redirect if we are not already on this path
        if (window.location.pathname !== path) {
          console.log('[DeepLinkHandler] Redirecting to:', path);
          window.location.href = path;
        }
      }
    } catch (err) {
      console.error('[DeepLinkHandler] Error parsing deep link URL:', err);
    }
  };

  // This is a headless component, it renders nothing.
  return null;
}
