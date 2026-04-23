(function () {
  const $ = (id) => document.getElementById(id);

  const logEl = $("log");
  const analysisEl = $("analysis");
  const runBtn = $("runBtn");

  const log = (msg, asError = false) => {
    const prefix = asError ? "[ERROR]" : "[INFO]";
    logEl.textContent = `${new Date().toLocaleTimeString()} ${prefix} ${msg}\n${logEl.textContent}`;
  };

  const parseBreaks = (raw) => {
    const values = raw
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    return [...new Set(values)].sort((a, b) => a - b);
  };

  require(
    [
      "esri/config",
      "esri/Map",
      "esri/views/MapView",
      "esri/Graphic",
      "esri/rest/locator",
      "esri/rest/serviceArea",
      "esri/rest/support/ServiceAreaParameters",
      "esri/rest/support/FeatureSet",
    ],
    function (esriConfig, Map, MapView, Graphic, locator, serviceArea, ServiceAreaParameters, FeatureSet) {
      const map = new Map({ basemap: "streets-navigation-vector" });
      const view = new MapView({
        container: "viewDiv",
        map,
        center: [-70.6043, -33.455],
        zoom: 14,
      });

      const geocoderUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";
      const serviceAreaUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World";

      async function geocode(singleLine) {
        log(`Geocodificando: \"${singleLine}\"`);
        const candidates = await locator.addressToLocations(geocoderUrl, {
          address: { SingleLine: singleLine },
          maxLocations: 1,
          outFields: ["Match_addr"],
          locationType: "rooftop",
          countryCode: "CHL",
        });

        if (!candidates.length) {
          throw new Error("No se encontraron coincidencias para ese texto.");
        }

        const best = candidates[0];
        log(`Match: ${best.attributes.Match_addr}`);
        return best;
      }

      async function solveArea(location, modeName, minutes) {
        log(`Calculando service area (${modeName}) con breaks ${minutes.join(", ")} min`);

        const facilityGraphic = new Graphic({ geometry: location });
        const params = new ServiceAreaParameters({
          facilities: new FeatureSet({ features: [facilityGraphic] }),
          defaultBreaks: minutes,
          outSpatialReference: { wkid: 4326 },
          trimOuterPolygon: true,
          travelMode: modeName,
          returnFacilities: false,
          returnPolygons: true,
          outputLines: "none",
        });

        const result = await serviceArea.solve(serviceAreaUrl, params);
        const polygons = result.serviceAreaPolygons?.features ?? [];

        if (!polygons.length) {
          throw new Error("El servicio no devolvió polígonos. Revisa permisos de Network Analysis en tu API key.");
        }

        return polygons;
      }

      async function analyzeWithClaude(payload) {
        const proxyUrl = $("claudeProxy").value.trim();
        if (!proxyUrl) {
          analysisEl.textContent = "Sin análisis Claude: completa la URL de proxy para habilitarlo.";
          return;
        }

        const body = {
          model: "claude-3-5-sonnet-latest",
          max_tokens: 350,
          messages: [
            {
              role: "user",
              content: `Analiza este resultado de service area en Santiago de Chile y describe qué tipo de zona cubre (residencial, comercio, conectividad, etc). Responde en español, en 6-8 viñetas claras. Datos: ${JSON.stringify(
                payload
              )}`,
            },
          ],
        };

        log("Solicitando análisis a Claude vía proxy...");
        const res = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Claude proxy respondió ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        const text = data?.content?.map((c) => c.text).join("\n")?.trim();
        analysisEl.textContent = text || "Claude no devolvió texto utilizable.";
      }

      runBtn.addEventListener("click", async () => {
        try {
          runBtn.disabled = true;
          analysisEl.textContent = "Calculando...";

          const apiKey = $("arcgisKey").value.trim();
          const placeText = $("placeInput").value.trim();
          const modeName = $("mode").value;
          const minutes = parseBreaks($("breaks").value);

          if (!apiKey) {
            throw new Error("Debes ingresar tu ArcGIS API Key.");
          }

          if (!placeText) {
            throw new Error("Debes ingresar un lugar para geocodificar.");
          }

          if (!minutes.length) {
            throw new Error("Debes ingresar al menos un minuto válido, ej: 5,10,15");
          }

          esriConfig.apiKey = apiKey;

          const candidate = await geocode(placeText);
          const point = candidate.location;

          const polygons = await solveArea(point, modeName, minutes);

          view.graphics.removeAll();
          view.graphics.add(
            new Graphic({
              geometry: point,
              symbol: {
                type: "simple-marker",
                color: "#0ea5e9",
                size: 10,
                outline: { color: "#ffffff", width: 1.5 },
              },
              popupTemplate: {
                title: "Punto de origen",
                content: candidate.attributes.Match_addr,
              },
            })
          );

          const baseColors = [
            [16, 185, 129, 0.18],
            [245, 158, 11, 0.18],
            [239, 68, 68, 0.18],
            [59, 130, 246, 0.18],
          ];

          polygons.forEach((poly, idx) => {
            poly.symbol = {
              type: "simple-fill",
              color: baseColors[idx % baseColors.length],
              outline: { color: [31, 41, 55, 0.9], width: 1.2 },
            };
            poly.popupTemplate = {
              title: `${modeName} - ${poly.attributes?.FromBreak ?? "?"} a ${poly.attributes?.ToBreak ?? "?"} min`,
              content: candidate.attributes.Match_addr,
            };
          });

          view.graphics.addMany(polygons.reverse());
          await view.goTo(view.graphics.toArray(), { duration: 900 });

          const payload = {
            query: placeText,
            matchedAddress: candidate.attributes.Match_addr,
            mode: modeName,
            breaks: minutes,
            center: {
              longitude: Number(point.longitude?.toFixed(6)),
              latitude: Number(point.latitude?.toFixed(6)),
            },
            polygonCount: polygons.length,
          };

          await analyzeWithClaude(payload);
          log("Proceso completado ✅");
        } catch (error) {
          log(error.message, true);
          analysisEl.textContent = `Falló el proceso:\n${error.message}`;
        } finally {
          runBtn.disabled = false;
        }
      });

      log("Listo. Ingresa API key, lugar y presiona calcular.");
    }
  );
})();
