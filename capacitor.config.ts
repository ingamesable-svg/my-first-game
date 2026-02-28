import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ingamesable.starcatcher',
  appName: 'Star Catcher',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
