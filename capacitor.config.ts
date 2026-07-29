import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sentralogis.driver",
  appName: "SentraLogis Driver",
  webDir: "out",
  server: {
    url: "https://www.sentralogis.com",
    cleartext: true,
    allowNavigation: [
      "sentralogis.com",
      "*.sentralogis.com",
      "www.sentralogis.com",
      "app.sentralogis.com",
    ],
  },
  android: {
    appendUserAgent: "SentraLogis_AndroidApp",
  },
  plugins: {
    DeepLinks: {
      customSchemes: ["sentralogis"],
    },
  },
};

export default config;
