const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

/**
 * Expo config plugin for CarPlay audio support.
 *
 * Adds the CarPlay audio entitlement and ensures background audio is enabled.
 * The native CarPlay scene + RN bridge live in ./carplay/ios and must be added
 * to the iOS target after `expo prebuild` (see carplay/README.md). They are not
 * auto-copied because adopting the UIScene lifecycle is project-specific.
 *
 * Enable by adding "./plugins/withCarPlay" to the `plugins` array in app.json,
 * then running `npx expo prebuild -p ios`.
 *
 * Note: the `com.apple.developer.carplay-audio` entitlement requires approval
 * from Apple for App Store distribution. It works in development with a
 * provisioning profile that includes it.
 */
const withCarPlay = (config) => {
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.carplay-audio'] = true;
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    const modes = cfg.modResults.UIBackgroundModes ?? [];
    if (!modes.includes('audio')) modes.push('audio');
    cfg.modResults.UIBackgroundModes = modes;
    return cfg;
  });

  return config;
};

module.exports = withCarPlay;
