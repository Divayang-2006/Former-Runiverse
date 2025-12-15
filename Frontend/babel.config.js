module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // --- ADD THIS PLUGINS SECTION ---
    plugins: [
      "react-native-reanimated/plugin",
    ],
  };
};