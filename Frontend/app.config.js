// Dynamic Expo config to allow environment variable substitution for Mapbox token
// Assumption: EAS secret named MAPBOX_DOWNLOAD_TOKEN will be injected at build time.

import 'dotenv/config';

export default ({ config }) => {
   // Fallback to config passed in or default object
   const mapboxToken = process.env.MAPBOX_DOWNLOAD_TOKEN || '';
   if (!mapboxToken) {
      // Non-fatal warning in dev; EAS build will inject it as secret
      console.warn('[app.config.js] MAPBOX_DOWNLOAD_TOKEN is not set. Mapbox downloads may fail.');
   }
   return {
      expo: {
         name: 'Runiverse',
         slug: 'Runiverse',
         version: '1.0.0',
         orientation: 'portrait',
         icon: './assets/images/icon.png',
         scheme: 'runiverse',
         userInterfaceStyle: 'automatic',
         newArchEnabled: false,
         ios: {
            supportsTablet: true,
            infoPlist: {
               NSAppTransportSecurity: {
                  NSAllowsArbitraryLoads: true, // dev only; prefer ATS exceptions per domain in prod
               },
            },
         },
         android: {
            adaptiveIcon: {
               foregroundImage: './assets/images/adaptive-icon.png',
               backgroundColor: '#ffffff',
            },
            edgeToEdgeEnabled: true,
            package: 'com.imagine_x.Runiverse',
            permissions: [
               'ACCESS_FINE_LOCATION',
               'ACCESS_COARSE_LOCATION',
               'ACCESS_BACKGROUND_LOCATION',
               'FOREGROUND_SERVICE',
            ],
            foregroundService: {
               notificationTitle: 'Walking Route Active',
               notificationBody: 'Tracking your path for the fitness app.',
            },
            usesCleartextTraffic: true, // allow http:// for dev
         },
         web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
         },
         plugins: [
            'expo-router',
            [
               'expo-splash-screen',
               {
                  image: './assets/images/splash-icon.png',
                  imageWidth: 200,
                  resizeMode: 'contain',
                  backgroundColor: '#ffffff',
               },
            ],
            [
               '@rnmapbox/maps',
               {
                  RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
               },
            ],
            [
               'expo-location',
               {
                  locationAlwaysAndWhenInUsePermission:
                     'Allow $(PRODUCT_NAME) to use your location.',
                  locationWhenInUsePermission:
                     'Allow $(PRODUCT_NAME) to use your location while the app is running.',
               },
            ],
         ],
         experiments: {
            typedRoutes: true,
         },
         extra: {
            router: {},
            eas: {
               projectId: '5233a97b-f485-4172-a36c-db748f469175',
            },
            mapboxToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
            apiUrl: 'https://runiverse.onrender.com',
         },
         owner: 'imagine_x',
      },
   };
};
