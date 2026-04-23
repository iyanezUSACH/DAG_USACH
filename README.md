# Service Area de Farmacias (ArcGIS + Claude)

Aplicación web estática (sin npm) para:

1. Geocodificar texto libre en español (por ejemplo: `farmacia en plaza ñuñoa`).
2. Calcular áreas de servicio (service area) por tiempo.
3. Elegir modo de viaje `A pie` (`Walking Time`) o `En auto` (`Driving Time`).
4. (Opcional) Enviar un resumen del resultado a Claude mediante un proxy para obtener una descripción textual del área.

## Requisitos

- ArcGIS API Key con permisos de:
  - Geocoding
  - Network Analysis
- Navegador moderno con internet.
- (Opcional) URL de proxy que reciba POST y reenvíe a `https://api.anthropic.com/v1/messages`.

## Ejecución

Como es un sitio estático puedes abrirlo con cualquier servidor simple:

```bash
python3 -m http.server 8080
```

Luego abre `http://localhost:8080`.

## Notas importantes de CORS

La API de Anthropic no está habilitada para llamarla directo desde frontend público con tu API key.
Por eso el campo `Claude Proxy URL` es opcional y debe apuntar a un backend/worker propio que haga de intermediario.
