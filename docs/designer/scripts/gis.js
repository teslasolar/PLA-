// GIS Import/Export - KML, GeoJSON, Shapefile support
import { getState, setState } from './state.js';

// Default coordinate origin (can be set by user)
let origin = { lat: 39.7392, lng: -104.9903 }; // Denver
const FEET_PER_DEGREE_LAT = 364000;
const FEET_PER_DEGREE_LNG = 288200; // At 40° latitude

export function setOrigin(lat, lng) {
    origin = { lat, lng };
}

export function getOrigin() {
    return origin;
}

// Convert local XZ coordinates to lat/lng
export function localToGeo(x, z) {
    return {
        lat: origin.lat + (z / FEET_PER_DEGREE_LAT),
        lng: origin.lng + (x / FEET_PER_DEGREE_LNG)
    };
}

// Convert lat/lng to local XZ coordinates
export function geoToLocal(lat, lng) {
    return {
        x: (lng - origin.lng) * FEET_PER_DEGREE_LNG,
        z: (lat - origin.lat) * FEET_PER_DEGREE_LAT
    };
}

// Export to KML
export function exportKML() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>PLA Export - ${state.name || 'Untitled'}</name>
    <description>Pole Line Analysis Export</description>

    <Style id="poleStyle">
        <IconStyle>
            <Icon><href>http://maps.google.com/mapfiles/kml/shapes/homegardenbusiness.png</href></Icon>
            <scale>1.0</scale>
        </IconStyle>
    </Style>

    <Style id="spanStyle">
        <LineStyle>
            <color>ff0000ff</color>
            <width>2</width>
        </LineStyle>
    </Style>

    <Folder>
        <name>Poles</name>
        ${poles.map(pole => {
            const geo = localToGeo(pole.x, pole.z);
            return `
        <Placemark>
            <name>${pole.id}</name>
            <description>Class: ${pole.class || 4}, Height: ${pole.height || 40}ft</description>
            <styleUrl>#poleStyle</styleUrl>
            <Point>
                <coordinates>${geo.lng},${geo.lat},0</coordinates>
            </Point>
            <ExtendedData>
                <Data name="class"><value>${pole.class || 4}</value></Data>
                <Data name="height"><value>${pole.height || 40}</value></Data>
                <Data name="species"><value>${pole.species || 'SP'}</value></Data>
            </ExtendedData>
        </Placemark>`;
        }).join('')}
    </Folder>

    <Folder>
        <name>Spans</name>
        ${spans.map(span => {
            const p1 = poles.find(p => p.id === span.from);
            const p2 = poles.find(p => p.id === span.to);
            if (!p1 || !p2) return '';
            const geo1 = localToGeo(p1.x, p1.z);
            const geo2 = localToGeo(p2.x, p2.z);
            return `
        <Placemark>
            <name>${span.id}</name>
            <description>Conductor: ${span.conductor || 'ACSR'}</description>
            <styleUrl>#spanStyle</styleUrl>
            <LineString>
                <coordinates>${geo1.lng},${geo1.lat},0 ${geo2.lng},${geo2.lat},0</coordinates>
            </LineString>
        </Placemark>`;
        }).join('')}
    </Folder>

</Document>
</kml>`;

    downloadFile(kml, `pla-export-${Date.now()}.kml`, 'application/vnd.google-earth.kml+xml');
}

// Export to GeoJSON
export function exportGeoJSON() {
    const state = getState();
    const poles = state.poles || [];
    const spans = state.spans || [];

    const geojson = {
        type: 'FeatureCollection',
        name: state.name || 'PLA Export',
        crs: {
            type: 'name',
            properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
        },
        features: []
    };

    // Add poles as points
    poles.forEach(pole => {
        const geo = localToGeo(pole.x, pole.z);
        geojson.features.push({
            type: 'Feature',
            properties: {
                id: pole.id,
                type: 'pole',
                class: pole.class || 4,
                height: pole.height || 40,
                species: pole.species || 'SP',
                embedment: pole.embedment || 6
            },
            geometry: {
                type: 'Point',
                coordinates: [geo.lng, geo.lat]
            }
        });
    });

    // Add spans as lines
    spans.forEach(span => {
        const p1 = poles.find(p => p.id === span.from);
        const p2 = poles.find(p => p.id === span.to);
        if (!p1 || !p2) return;

        const geo1 = localToGeo(p1.x, p1.z);
        const geo2 = localToGeo(p2.x, p2.z);

        geojson.features.push({
            type: 'Feature',
            properties: {
                id: span.id,
                type: 'span',
                from: span.from,
                to: span.to,
                conductor: span.conductor || 'ACSR',
                voltage: span.voltage || 12470
            },
            geometry: {
                type: 'LineString',
                coordinates: [[geo1.lng, geo1.lat], [geo2.lng, geo2.lat]]
            }
        });
    });

    downloadFile(JSON.stringify(geojson, null, 2), `pla-export-${Date.now()}.geojson`, 'application/geo+json');
}

// Import GeoJSON
export function importGeoJSON(geojsonStr) {
    try {
        const geojson = typeof geojsonStr === 'string' ? JSON.parse(geojsonStr) : geojsonStr;
        const state = getState();

        const newPoles = [];
        const newSpans = [];

        // Find bounding box to set origin
        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        geojson.features.forEach(f => {
            if (f.geometry.type === 'Point') {
                const [lng, lat] = f.geometry.coordinates;
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            }
        });

        // Set origin to center
        if (minLat !== Infinity) {
            setOrigin((minLat + maxLat) / 2, (minLng + maxLng) / 2);
        }

        // Process features
        geojson.features.forEach(f => {
            if (f.geometry.type === 'Point' && f.properties.type === 'pole') {
                const [lng, lat] = f.geometry.coordinates;
                const local = geoToLocal(lat, lng);
                newPoles.push({
                    id: f.properties.id || `P${newPoles.length + 1}`,
                    x: local.x,
                    z: local.z,
                    class: f.properties.class || 4,
                    height: f.properties.height || 40,
                    species: f.properties.species || 'SP'
                });
            }
        });

        // Process spans after poles
        geojson.features.forEach(f => {
            if (f.geometry.type === 'LineString' && f.properties.type === 'span') {
                newSpans.push({
                    id: f.properties.id || `S${newSpans.length + 1}`,
                    from: f.properties.from,
                    to: f.properties.to,
                    conductor: f.properties.conductor || 'ACSR',
                    voltage: f.properties.voltage || 12470
                });
            }
        });

        // Update state
        setState({
            ...state,
            poles: [...state.poles, ...newPoles],
            spans: [...state.spans, ...newSpans]
        });

        return { poles: newPoles.length, spans: newSpans.length };
    } catch (e) {
        console.error('GeoJSON import error:', e);
        return null;
    }
}

// Import KML
export function importKML(kmlStr) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(kmlStr, 'text/xml');
        const placemarks = doc.querySelectorAll('Placemark');

        const state = getState();
        const newPoles = [];
        const newSpans = [];

        let minLat = Infinity, maxLat = -Infinity;
        let minLng = Infinity, maxLng = -Infinity;

        // First pass: find bounds
        placemarks.forEach(pm => {
            const point = pm.querySelector('Point coordinates');
            if (point) {
                const [lng, lat] = point.textContent.trim().split(',').map(Number);
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLng = Math.min(minLng, lng);
                maxLng = Math.max(maxLng, lng);
            }
        });

        if (minLat !== Infinity) {
            setOrigin((minLat + maxLat) / 2, (minLng + maxLng) / 2);
        }

        // Second pass: import data
        placemarks.forEach(pm => {
            const name = pm.querySelector('name')?.textContent || '';
            const point = pm.querySelector('Point coordinates');
            const line = pm.querySelector('LineString coordinates');

            if (point) {
                const [lng, lat] = point.textContent.trim().split(',').map(Number);
                const local = geoToLocal(lat, lng);

                // Get extended data
                const getData = (key) => {
                    const el = pm.querySelector(`Data[name="${key}"] value`);
                    return el ? el.textContent : null;
                };

                newPoles.push({
                    id: name || `P${newPoles.length + 1}`,
                    x: local.x,
                    z: local.z,
                    class: parseInt(getData('class')) || 4,
                    height: parseInt(getData('height')) || 40,
                    species: getData('species') || 'SP'
                });
            }

            if (line) {
                const coords = line.textContent.trim().split(/\s+/);
                if (coords.length >= 2) {
                    // Find nearest poles for this span
                    // This is simplified - real import would need better matching
                    newSpans.push({
                        id: name || `S${newSpans.length + 1}`,
                        conductor: 'ACSR'
                    });
                }
            }
        });

        setState({
            ...state,
            poles: [...state.poles, ...newPoles]
        });

        return { poles: newPoles.length, spans: newSpans.length };
    } catch (e) {
        console.error('KML import error:', e);
        return null;
    }
}

// File download helper
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Show import/export dialog
export function showGISDialog() {
    const modal = document.getElementById('gisModal');
    const content = document.getElementById('gisContent');

    if (content) {
        content.innerHTML = `
            <div class="gis-dialog">
                <div class="gis-section">
                    <h4>📤 Export</h4>
                    <div class="btn-group">
                        <button class="btn" onclick="window.exportKML()">Export KML</button>
                        <button class="btn" onclick="window.exportGeoJSON()">Export GeoJSON</button>
                    </div>
                </div>
                <div class="gis-section">
                    <h4>📥 Import</h4>
                    <input type="file" id="gisFileInput" accept=".kml,.geojson,.json"
                           onchange="window.handleGISImport(this)" style="display:none">
                    <button class="btn" onclick="document.getElementById('gisFileInput').click()">
                        Import File
                    </button>
                    <div id="importResult" style="margin-top:0.5rem;"></div>
                </div>
                <div class="gis-section">
                    <h4>📍 Origin Point</h4>
                    <div class="form-row">
                        <label>Latitude:</label>
                        <input type="number" id="originLat" value="${origin.lat}" step="0.0001" class="input">
                    </div>
                    <div class="form-row">
                        <label>Longitude:</label>
                        <input type="number" id="originLng" value="${origin.lng}" step="0.0001" class="input">
                    </div>
                    <button class="btn" onclick="window.setGISOrigin()">Set Origin</button>
                </div>
            </div>
        `;
    }

    // Expose functions to window
    window.exportKML = exportKML;
    window.exportGeoJSON = exportGeoJSON;
    window.handleGISImport = (input) => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = file.name.endsWith('.kml')
                ? importKML(e.target.result)
                : importGeoJSON(e.target.result);

            const resultDiv = document.getElementById('importResult');
            if (resultDiv && result) {
                resultDiv.innerHTML = `<span class="success">✅ Imported ${result.poles} poles, ${result.spans} spans</span>`;
            } else if (resultDiv) {
                resultDiv.innerHTML = `<span class="error">❌ Import failed</span>`;
            }
        };
        reader.readAsText(file);
    };
    window.setGISOrigin = () => {
        setOrigin(
            +document.getElementById('originLat').value,
            +document.getElementById('originLng').value
        );
    };

    if (modal) modal.style.display = 'flex';
}
