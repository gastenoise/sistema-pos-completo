<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>API Pública | Sistema de Ventas</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
      :root {
        color-scheme: light;
        --bg: #f8fafc;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #475569;
        --accent: #0ea5e9;
        --border: #e2e8f0;
      }

      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
        background: var(--bg);
        color: var(--text);
      }

      .navbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border);
        background: var(--card);
      }

      .brand {
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 0.02em;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text);
        text-decoration: none;
        font-weight: 600;
      }

      .button.primary {
        background: var(--accent);
        color: #0b1120;
        border-color: transparent;
      }

      .swagger-wrap {
        padding: 24px;
      }

      .swagger-ui {
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35);
      }

      .swagger-ui .topbar {
        display: none;
      }

      .swagger-ui,
      .swagger-ui .wrapper,
      .swagger-ui .opblock,
      .swagger-ui .info,
      .swagger-ui .scheme-container,
      .swagger-ui .model-box,
      .swagger-ui .model,
      .swagger-ui .parameter__name,
      .swagger-ui .parameter__type,
      .swagger-ui .parameter__deprecated,
      .swagger-ui .tab li,
      .swagger-ui .response-col_status,
      .swagger-ui .response-col_description,
      .swagger-ui .responses-inner h4,
      .swagger-ui .responses-inner h5,
      .swagger-ui .opblock-title,
      .swagger-ui .opblock-description-wrapper,
      .swagger-ui .opblock-summary,
      .swagger-ui .opblock-summary-description,
      .swagger-ui .opblock-summary-method,
      .swagger-ui .opblock-summary-path,
      .swagger-ui .opblock-summary-path__deprecated,
      .swagger-ui .model-title,
      .swagger-ui .parameter__name.required:after,
      .swagger-ui .parameter__type,
      .swagger-ui .response-col_links {
        color: var(--text);
      }

      .swagger-ui .opblock-summary-path,
      .swagger-ui .opblock-summary-path__deprecated {
        color: var(--text);
      }

      .swagger-ui .opblock {
        background: #ffffff;
        border: 1px solid var(--border);
      }

      .swagger-ui .opblock-summary,
      .swagger-ui .opblock-section-header {
        background: #f1f5f9;
      }

      .swagger-ui .opblock .opblock-summary-description,
      .swagger-ui .opblock-description-wrapper p,
      .swagger-ui .opblock-external-docs-wrapper p,
      .swagger-ui .opblock-title_normal {
        color: var(--muted);
      }

      .swagger-ui .scheme-container {
        background: #ffffff;
        border: 1px solid var(--border);
      }

      .swagger-ui .btn {
        background: var(--accent);
        color: #0b1120;
        border: none;
      }

      .swagger-ui .btn.cancel {
        background: #e2e8f0;
        color: #0f172a;
      }

      .swagger-ui .model-box,
      .swagger-ui .model,
      .swagger-ui .responses-table {
        background: #ffffff;
        border: 1px solid var(--border);
      }

      .swagger-ui .response-col_status,
      .swagger-ui .response-col_description {
        background: transparent;
      }

      .swagger-ui .info .title small {
        background: #e2e8f0;
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <header class="navbar">
      <div class="brand">Documentación API</div>
      <div class="actions">
        <a class="button" href="{{ $openapiUrl }}" target="_blank" rel="noopener">OpenAPI {{ $title }}</a>
      </div>
    </header>

    <div class="swagger-wrap">
      <div id="swagger-ui"></div>
    </div>

    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        SwaggerUIBundle({
          url: "{{ $openapiUrl }}",
          dom_id: "#swagger-ui",
          deepLinking: true,
          docExpansion: "list",
          displayRequestDuration: true,
          persistAuthorization: true
        });
      };
    </script>
  </body>
</html>
