window.onload = function () {
  const openapiUrl = document.getElementById('swagger-ui-init')
    ? document.getElementById('swagger-ui-init').getAttribute('data-openapi-url')
    : "/openapi/public.json"; // fallback

  SwaggerUIBundle({
    url: openapiUrl,
    dom_id: "#swagger-ui",
    deepLinking: true,
    docExpansion: "list",
    displayRequestDuration: true,
    persistAuthorization: true
  });
};