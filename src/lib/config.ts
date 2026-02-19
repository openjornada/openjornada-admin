// App configuration from environment variables
export const appConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  appName: process.env.NEXT_PUBLIC_APP_NAME || "OpenJornada",
  appLogo: process.env.NEXT_PUBLIC_APP_LOGO || "/logo.png",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};
