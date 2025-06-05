// Using CommonJS `module.exports` syntax
const PROXY_CONFIG = {
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/api": "" // Optional: if your backend doesn't have the /api prefix
    }
  }
};

module.exports = PROXY_CONFIG;
