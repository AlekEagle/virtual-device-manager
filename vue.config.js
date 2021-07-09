module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      builderOptions: {
        icon: './src/assets/logo_large.png',
        appId: 'com.alekeagle.virtual-device-manager',
        linux: {
          category: 'Utilities',
          maintainer: 'vdm-support@alekeagle.com',
          target: [
            {
              target: 'appimage',
              arch: ['x64']
            },
            {
              target: 'deb',
              arch: ['x64']
            },
            {
              target: 'rpm',
              arch: ['x64']
            },
            {
              target: 'pacman',
              arch: ['x64']
            }
          ]
        }
      }
    }
  }
};
