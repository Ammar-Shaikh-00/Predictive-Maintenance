module.exports = {
  input: [
    "src/**/*.{js,jsx,ts,tsx}"
  ],
  output: "./src/locales",
  options: {
    debug: false,
    removeUnusedKeys: false,
    func: {
      list: ["t"],
      extensions: [".js", ".jsx"]
    },
    lngs: ["en"],
    defaultLng: "en",
    resource: {
      loadPath: "src/locales/{{lng}}.json",
      savePath: "src/locales/{{lng}}.json"
    }
  }
};