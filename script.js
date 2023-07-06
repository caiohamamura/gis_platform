let osm = L.tileLayer(
    'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 18,
});

let landsat = L.esri
    .imageMapLayer({
        url: "https://landsat.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer",
        attribution: "United States Geological Survey (USGS), National Aeronautics and Space Administration (NASA)"
    });

let lyr = L.tileLayer(
    'tms/{z}/{x}/{y}.png',
    {
        tms: 0,
        opacity: 0.7,
        attribution: "",
        minZoom: 0,
        maxZoom: 18,
        nativeZooms: [0, 1, 2, 3, 4, 5, 6, 7],
        bounds: [
            [23.115671759, -128.589211618],
            [51.876925960, -68.724066390]
        ],
    });



let map = L.map('map', {
    pmIgnore: false,
    layers: [osm, lyr],
    zoomControl: false,
}).setView([40, -90], 3);

var baseMaps = {
    "OpenStreetMap": osm,
    // "Landsat": landsat
};

// Allow drawing rectangle
let overlays = [];

var layerControl = L.control.layers(baseMaps, [lyr, ...overlays], options = { "collapsed": false, position: 'topleft' }).addTo(map);
var zoomControl = L.control.zoom().addTo(map);

L.control.scale().addTo(map);
layerControl._baseLayersList.querySelector('label:nth-child(1)>span>span').classList.add('checked');

map.pm.addControls({
    position: 'topleft',
    drawMarker: false,
    drawPolyline: false,
    drawCircle: false,
    drawCircleMarker: false,
    drawText: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    removalMode: false,
    rotateMode: false,
});




function bindPopup(overlay, mean) {
    overlay.bindPopup(
        L.popup({ closeOnClick: false, })
            .setLatLng(overlay.getBounds().getCenter())
            .setContent(`<p>Mean: ${mean}</p>`)
            .addTo(map));
    overlays.push(overlay);
    overlay.on('mouseover', function () {
        this.openPopup();
    });
}

async function handleDrawEnd(event) {
    let overlay = event.layer;
    overlays.push(overlay);
    let res, obj;
    switch (event.shape) {
        case 'Rectangle':
            res = await fetch(`http://localhost:9000/api?bbox=${overlay.getBounds().toBBoxString()}&layer=carbon`)
            obj = await res.json();
            bindPopup(overlay, obj.mean[0]);
            break;
        case 'Polygon':
            //console.log('Polygon');
            //console.log(event);
            let wkt = convertLatLngToWKT(event.layer.getLatLngs()[0]);
            res = await fetch(`http://localhost:9000/polygon?${new URLSearchParams({
                wkt: wkt
            })
                }`);
            obj = await res.json();
            // console.log(obj);
            bindPopup(overlay, obj.mean[0]);
            break;
    }
}

map.on('pm:create', handleDrawEnd);

map.pm.Toolbar.createCustomControl({
    name: 'uploadShp',
    block: '',
    className: 'fas fa-file-upload font-awesome-toolbar',
    title: 'Upload zipped shapefile',
    onClick: () => {
        shapefile.click();
        shapefile.onchange = async () => {
            let file = shapefile.files[0];
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('http://localhost:9000/upload', {
                method: 'POST',
                body: formData
            });
            const obj = await response.json();
            let overlay = L.geoJSON(JSON.parse(obj.geojson[0])).addTo(map);
            bindPopup(overlay, obj.mean[0]);
        }
    },
    toggle: false,
});

map.pm.Toolbar.createCustomControl({
    name: 'clearAll',
    block: 'custom',
    className: 'fas fa-remove font-awesome-toolbar',
    title: 'Clear all layers',
    onClick: () => {
        for (let layerIndex = 0; layerIndex < overlays.length; layerIndex++) {
            overlays[layerIndex]?.remove();
            delete overlays[layerIndex];
        }
        delete overlays;
        overlays = [];
    },
    toggle: false,
});

function convertLatLngToWKT(latlngList, srid) {
    var wktString = "POLYGON ((";

    // Iterate over each latlng object and construct the WKT string
    for (var i = 0; i < latlngList.length; i++) {
        var latlng = latlngList[i];
        wktString += latlng.lng + " " + latlng.lat;

        // Add a comma separator between coordinates except for the last one
        if (i < latlngList.length - 1) {
            wktString += ",";
        }
    }

    wktString += "))";
    let sridOut = srid ? `SRID=${srid};` : '';
    return sridOut + wktString;
}

// let timeoutAutocomplete;
// searchPrompt.onkeydown = function () {
//     if (timeoutAutocomplete)
//         clearTimeout(timeoutAutocomplete);
//     timeoutAutocomplete = setTimeout(getSearchResults, 500);
// }

// async function getSearchResults() {
//     let res = await fetch(`https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(searchPrompt.value)}&polygon_geojson=0&format=jsonv2`);
//     let obj = await res.json();
//     let content = obj.map(el => ({
//         title: el.display_name
//     }));

//     console.log(obj);
// }

let results = [];
let searchLayer;

$('#searchPrompt')
    .dropdown({
        forceSelection: true,
        searchDelay: 500,
        apiSettings: {
            url: 'https://nominatim.openstreetmap.org/search.php?q={query}&format=jsonv2',
            onResponse: function (res) {
                // console.log(res);
                var response = {
                    results: {}
                };
                results = Object.values(res).filter(el => el.category == 'boundary').map((el, ind) => ({
                    name: el.display_name,
                    value: el.place_id,
                    text: el.display_name,
                    bbox: el.boundingbox,
                    lat: el.lat,
                    lon: el.lon,
                }));
                response.results = results;
                return response;
            },
        },
        onChange: changedValue
    });

async function changedValue(value, text, choice) {
    // console.log(result);
    console.log(value);
    console.log(text);
    console.log(choice);

    let res = await fetch(`https://nominatim.openstreetmap.org/details.php?place_id=${value}&format=json&polygon_geojson=1`);
    let result = await res.json();
    console.log(result);
    let bbox = result.boundingbox;
    searchLayer = L.geoJSON(result.geometry).addTo(map);
    map.fitBounds(searchLayer.getBounds());
    queryGeoJson(result);
    document.activeElement.blur();
}
$('#searchPrompt').onselect = changedValue;

async function queryGeoJson(result) {
    res = await fetch('http://localhost:9000/geojson', {
        method: 'POST',
        body: JSON.stringify({
            "geojson": result.geometry
        })
    });
    obj = await res.json();
    bindPopup(searchLayer, obj.mean[0]);
}

map.on('baselayerchange', function (e) {
    // e.layer is the selected base layer
    $(".leaflet-control-layers-base > label > span > span").each((i, el) => { if (el.innerText == e.name) { el.classList.add('checked'); } else { el.classList.remove('checked'); } });

});