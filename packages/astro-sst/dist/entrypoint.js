import { version as ASTRO_VERSION } from "astro/package.json";
import { NodeApp } from "astro/app/node";
import { polyfill } from "@astrojs/webapi";
import { convertFrom, convertTo } from "./lib/event-mapper.js";
import { debug } from "./lib/logger.js";
const astroMajorVersion = parseInt(ASTRO_VERSION.split(".")[0] ?? 0);
polyfill(globalThis, {
    exclude: "window document",
});
function createRequest(internalEvent) {
    const requestUrl = internalEvent.url;
    const requestProps = {
        method: internalEvent.method,
        headers: internalEvent.headers,
        body: ["GET", "HEAD"].includes(internalEvent.method)
            ? undefined
            : internalEvent.body,
    };
    return new Request(requestUrl, requestProps);
}
export function createExports(manifest, { responseMode }) {
    debug("handlerInit", responseMode);
    debug("astroVersion", ASTRO_VERSION);
    const isStreaming = responseMode === "stream";
    const app = new NodeApp(manifest);
    async function streamHandler(event, responseStream) {
        debug("event", event);
        // Parse Lambda event
        const internalEvent = convertFrom(event);
        // Build request
        const request = createRequest(internalEvent);
        // Handle page not found
        const routeData = app.match(request);
        if (!routeData) {
            return streamError(404, "Not found", responseStream);
        }
        let response;
        if (astroMajorVersion <= 3) {
            // Astro 3.x and below use RouteData only
            debug("routeData", routeData);
            // Process request
            response = await app.render(request, routeData);
        }
        else {
            // Astro 4.x and above use RenderOptions
            const renderOptions = {
                routeData,
                clientAddress: internalEvent.headers['x-forwarded-for'] || internalEvent.remoteAddress,
            };
            debug("renderOptions", renderOptions);
            // Process request
            response = await app.render(request, renderOptions);
        }
        // Stream response back to Cloudfront
        const convertedResponse = await convertTo({
            type: internalEvent.type,
            response,
            responseStream,
            cookies: Array.from(app.setCookieHeaders(response)),
        });
        debug("response", convertedResponse);
    }
    async function bufferHandler(event) {
        debug("event", event);
        // Parse Lambda event
        const internalEvent = convertFrom(event);
        // Build request
        const request = createRequest(internalEvent);
        // Handle page not found
        const routeData = app.match(request);
        if (!routeData) {
            console.error("Not found");
            return convertTo({
                type: internalEvent.type,
                response: new Response("Not found", { status: 404 }),
            });
        }
        const renderOptions = {
            routeData,
            clientAddress: internalEvent.headers['x-forwarded-for'] || internalEvent.remoteAddress,
        };
        debug("renderOptions", renderOptions);
        // Process request
        const response = await app.render(request, renderOptions);
        // Buffer response back to Cloudfront
        const convertedResponse = await convertTo({
            type: internalEvent.type,
            response,
            cookies: Array.from(app.setCookieHeaders(response)),
        });
        debug("response", convertedResponse);
        return convertedResponse;
    }
    return {
        // https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
        handler: isStreaming
            ? awslambda.streamifyResponse(streamHandler)
            : bufferHandler,
    };
}
export function streamError(statusCode, error, responseStream) {
    console.error(error);
    responseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode,
    });
    responseStream.write(error.toString());
    responseStream.end();
}
