import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.novelis.app',
  appName: 'Novelis',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
