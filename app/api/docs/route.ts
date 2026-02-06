/**
 * API Documentation Route
 *
 * Serves the interactive API documentation using Swagger UI.
 * This endpoint returns an HTML page with embedded Swagger UI that loads
 * the OpenAPI specification.
 *
 * @endpoint GET /api/docs - View interactive API documentation
 */

import { NextResponse } from 'next/server';

/**
 * Generate Swagger UI HTML
 */
function generateSwaggerHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rank API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html {
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .topbar {
      background-color: #1a1a1a;
      padding: 15px 0;
    }
    .topbar-wrapper {
      max-width: 1460px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topbar-wrapper .link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
      text-decoration: none;
      font-size: 16px;
      font-weight: 500;
    }
    .topbar-wrapper .link:hover {
      opacity: 0.8;
    }
    .topbar-wrapper .link svg {
      width: 20px;
      height: 20px;
    }
    .information-container {
      padding: 20px 0;
    }
    #swagger-ui {
      max-width: 1460px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-wrapper">
      <a class="link" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to App
      </a>
      <a class="link" href="/openapi.json" download="openapi.json">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download OpenAPI Spec
      </a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        syntaxHighlight: {
          activate: true,
          theme: "monokai"
        },
        displayRequestDuration: true,
        displayOperationId: false,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        validatorUrl: null,
        withCredentials: true,
        requestInterceptor: (request) => {
          // Add any default headers here
          return request;
        },
        responseInterceptor: (response) => {
          return response;
        }
      });

      window.ui = ui;
    };
  </script>
</body>
</html>`;
}

/**
 * GET /api/docs
 * Serve the Swagger UI documentation page
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  // Use the public OpenAPI spec file
  const specUrl = `${origin}/openapi.json`;

  return new NextResponse(generateSwaggerHtml(specUrl), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
