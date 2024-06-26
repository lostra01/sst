import defaultIntegration from "../adapter.js";
export default function createIntegration({ responseMode, serverRoutes, } = {}) {
    console.warn(`**************************************************************************
| !!! DEPRECATION WARNING !!!!
| The 'astro-sst/lambda' adapter is deprecated.
| Please use 'astro-sst' adapter instead.
| -----------------------------------------------------------------------
| import aws from "astro-sst";
|
| export default defineConfig({
|   adapter: aws({
|     deploymentStrategy: "regional",
|     serverRoutes: ["/api/*"],
|   }),  
| })
**************************************************************************`);
    return defaultIntegration({
        deploymentStrategy: "regional",
        responseMode: responseMode ?? "buffer",
        serverRoutes: serverRoutes ?? [],
    });
}
