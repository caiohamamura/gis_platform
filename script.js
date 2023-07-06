let osm = L.tileLayer(
    'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 18,
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
}).setView([40, -90], 3);

L.control.scale().addTo(map);

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


// Allow drawing rectangle
let overlay;
let thePopup;

async function handleDrawEnd(event) {
    overlay = event.layer;
    overlay.on('mouseover', function () {
        thePopup?.addTo(map);
    });
    let res, obj;
    switch (event.shape) {
        case 'Rectangle':
            let bounds = overlay.getBounds();
            res = await fetch(`http://localhost:9000/api?bbox=${bounds.toBBoxString()}&layer=carbon`)
            obj = await res.json();
            thePopup = L.popup()
                .setLatLng(bounds._northEast)
                .setContent(`<p>Mean: ${obj.mean[0]}</p>`)
                .addTo(map);
            break;
        case 'Polygon':
            console.log('Polygon');
            console.log(event);
            let wkt = convertLatLngToWKT(event.layer.getLatLngs()[0]);
            res = await fetch(`http://localhost:9000/polygon?${new URLSearchParams({
                wkt: wkt
            })
                }`);
            obj = await res.json();
            console.log(obj);
            thePopup = L.popup()
                .setLatLng(overlay.getBounds()._northEast)
                .setContent(`<p>Mean: ${obj.mean[0]}</p>`)
                .addTo(map);
            break;
    }
}

map.on('pm:create', handleDrawEnd);
map.on('pm:drawstart', function () {
    thePopup?.remove();
    thePopup = undefined;
    overlay?.remove();
});

map.pm.Toolbar.createCustomControl({
    name: 'uploadShp',
    block: 'custom',
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
            overlay?.remove();
            overlay = L.geoJSON(JSON.parse(obj.geojson[0])).addTo(map);
            thePopup?.remove();
            thePopup = undefined;
            thePopup = L.popup()
                .setLatLng(overlay.getBounds()._northEast)
                .setContent(`<p>Mean: ${obj.mean[0]}</p>`)
                .addTo(map);
        }
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

$('.ui.search')
    .search({
        searchDelay: 400,
        apiSettings: {
            url: 'https://nominatim.openstreetmap.org/search.php?q={query}&polygon_geojson=0&format=jsonv2',
            onResponse: function (res) {
                console.log(res);
                results = res;
                var
                    response = {
                        results: {}
                    }
                    ;
                response.results = Object.values(res).map((el, ind) => ({
                    title: el.display_name,
                    bbox: el.boundingbox,
                }));
                return response;
            },
        },
        onSelect: function(result, response) {
            // console.log(result);
            // console.log(response);
            let bbox = result.bbox;
    map.fitBounds([[bbox[0], bbox[2]],[bbox[1],bbox[3]]]);
        }
    });

