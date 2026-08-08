import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import { GoogleMapsProvider } from "@/lib/google-maps-context";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import DeepLinkHandler from "@/components/DeepLinkHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SENTRALOGIS | Unified Operational Matrix",
  description: "The next generation of enterprise logistics orchestration.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}
      >
        {/*
          Defense against browser-extension hydration mismatches.
          Extensions like FormDetector inject `fdprocessedid` (and similar) attributes
          into server-rendered HTML after parse but before React hydrates, causing
          "hydration mismatch" errors. Strip them immediately + continuously.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function () {
              var REMOVE_ATTRS = ["fdprocessedid", "fdprocessedid-removed"];
              function strip(el) {
                if (!el || el.nodeType !== 1) return;
                for (var i = 0; i < REMOVE_ATTRS.length; i++) {
                  if (el.hasAttribute(REMOVE_ATTRS[i])) {
                    el.removeAttribute(REMOVE_ATTRS[i]);
                  }
                }
              }
              function stripAll(root) {
                if (!root) return;
                strip(root);
                var all = root.querySelectorAll ? root.querySelectorAll("*") : [];
                for (var i = 0; i < all.length; i++) strip(all[i]);
              }
              // Strip anything already injected
              stripAll(document.documentElement);
              // Continuously strip attributes the extension adds before React hydrates
              if (typeof MutationObserver !== "undefined") {
                new MutationObserver(function (mutations) {
                  for (var m = 0; m < mutations.length; m++) {
                    var mutation = mutations[m];
                    if (mutation.type === "attributes") {
                      strip(mutation.target);
                    } else if (mutation.type === "childList") {
                      for (var n = 0; n < mutation.addedNodes.length; n++) {
                        stripAll(mutation.addedNodes[n]);
                      }
                    }
                  }
                }).observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: REMOVE_ATTRS,
                });
              }
              // Final sweep after DOM ready and right before React typically hydrates
              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", function () {
                  stripAll(document.documentElement);
                });
              }
            })();
          `,
          }}
        />
        <LanguageProvider>
          <AuthProvider>
            <GoogleMapsProvider>
              <DeepLinkHandler />
              <Toaster
                position="top-right"
                toastOptions={{
                  success: {
                    duration: 1000,
                  },
                  error: {
                    duration: 4000,
                  },
                }}
              />
              {children}
            </GoogleMapsProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
