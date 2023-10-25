const { ref, onCreated, onMounted } = Vue;
const { createVuetify } = Vuetify

const vuetify = createVuetify()

Vue.createApp({
    setup() {
        const activeBaseLayer = ref();
        const activeLayer = ref();
        const layersRef = ref();
        const mapRef = ref();
        const overleafLayersRef = ref();
        const opacity = ref(70);
        let rectangles = [];
        let polygons = [];
        let shapes = [];
        // Allow drawing rectangle
        let overlays = [];

        onMounted(async () => {
            const layers = await (await fetch('layers.json')).json();
            layersRef.value = layers;
            const initLayer = Object.keys(layers)[0];

            activeLayer.value = initLayer;

            let createArrayUpToIndex = (index) => Array.from(Array(index + 1).keys());

            let overleafLayers = {};
            let map;

            for (const l in layers) {
                const layer = layers[l];
                lyr =
                    L.tileLayer(
                        `${layers[l].location}/{z}/{x}/{y}.png`,
                        {
                            tms: 0,
                            opacity: 0.7,
                            attribution: "",
                            minZoom: 0,
                            maxZoom: 20,
                            nativeZooms: createArrayUpToIndex(layer.max_zoom),
                            bounds: layer.bounds,
                        }
                    );
                lyr.addEventListener('add', function () {
                    let checked = document.querySelector('.leaflet-left span.checked');
                    lyr.setOpacity(opacity.value / 100.0);
                    setTimeout(
                        function () {
                            checked?.classList.add('checked')
                        },
                        0
                    );
                    activeLayer.value = l;

                    unbindPopups();
                    for (let rect of rectangles) {
                        handleRectangle(rect);
                    }
                    for (let pol of polygons) {
                        handlePolygon(pol);
                    }
                    for (let shp of shapes) {
                        handleGeoJSON(shp);
                    }
                });
                overleafLayers[l] = lyr;
            }

            overleafLayersRef.value = overleafLayers;



            let osm = L.tileLayer(
                'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                minZoom: 0,
                maxZoom: 18,
            });
            let esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            });
            var baseMaps = {
                "ESRI": esri,
                "OpenStreetMap": osm,
            };

            for (let k in baseMaps) {
                let layer = baseMaps[k];
                layer.addEventListener('add', function () {
                    if (activeLayer.value in overleafLayers) {
                        overleafLayers[activeLayer.value]?.setZIndex(101);
                        let checked = document.querySelector('.leaflet-right span.checked');
                        setTimeout(
                            function () {
                                checked?.classList.add('checked');
                            },
                            0
                        );
                    }
                })
            }

            activeBaseLayer.value = 'ESRI';
            map = L.map('map', {
                crs: L.CRS.EPSG3857,
                pmIgnore: false,
                layers: [
                ],
                zoomControl: false,
            }).setView([40, -90], 3);

            mapRef.value = map;
            baseMaps[activeBaseLayer.value].addTo(map);
            overleafLayers[activeLayer.value].addTo(map);

            map.createPane('basePane');
            map.getPane('basePane').style.zIndex = 199;


            var layerControl = L.control.layers(baseMaps, {}, options = {
                "collapsed": false,
                "autoZIndex": false,
                position: 'topleft'
            }).addTo(map);


            let overleafLayersTitle = {};
            for (let k in overleafLayers) {
                const layer = layersRef.value[k];
                overleafLayersTitle[layer.title] = overleafLayers[k];
            }

            let layerControl2 = L.control.layers(overleafLayersTitle, {}, options = {
                "collapsed": false,
                "autoZIndex": true,
                position: 'topright'
            }).addTo(map);


            let layers2 = document.querySelector('.leaflet-right .leaflet-control-layers-base');
            let slider = document.querySelector('.v-slider');
            slider.remove();
            layers2.append(slider);


            var zoomControl = L.control.zoom().addTo(map);


            // ALLOW ONLY ONE TO BE SELECTED
            // Get the overlay container element
            const overlayContainer = layerControl.getContainer();

            L.control.scale().addTo(map);
            layerControl._baseLayersList.querySelector('label:nth-child(1)>span>span').classList.add('checked');
            layerControl2._baseLayersList.querySelector('label:nth-child(1)>span>span').classList.add('checked');



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
                if (overlays.some(e => e == overlay) == false)
                    overlays.push(overlay)
                overlay.on('mouseover', function () {
                    this.openPopup();
                });
            }

            async function handleDrawEnd(event) {
                let overlay = event.layer;
                let res, obj;
                switch (event.shape) {
                    case 'Rectangle':
                        await handleRectangle(overlay);
                        break;
                    case 'Polygon':
                        await handlePolygon(overlay);
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
                        const response = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/upload?layer=${activeLayer.value}`, {
                            method: 'POST',
                            body: formData
                        });
                        const obj = await response.json();
                        let overlay = L.geoJSON(JSON.parse(obj.geojson[0])).addTo(map);
                        shapes.push(overlay);
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
                    handleClearAll();
                },
                toggle: false,
            });


            function unbindPopups() {
                for (let overlay of overlays) {
                    overlay.closePopup();
                    overlay.unbindPopup();
                }
            }
            function handleClearAll() {
                for (let layerIndex = 0; layerIndex < overlays.length; layerIndex++) {
                    overlays[layerIndex]?.remove();
                    delete overlays[layerIndex];
                }
                delete overlays;
                overlays = [];
                rectangles = [];
                polygons = [];
            }

            async function handlePolygon(overlay) {
                let wkt = convertLatLngToWKT(overlay.getLatLngs()[0]);
                let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/polygon?${new URLSearchParams({
                    wkt: wkt,
                    layer: activeLayer.value
                })}`);
                let obj = await res.json();
                if (polygons.some(e => e == overlay) === false)
                    polygons.push(overlay);
                bindPopup(overlay, obj.mean[0]);
            }

            async function handleRectangle(overlay) {
                let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/api?bbox=${overlay.getBounds().toBBoxString()}&layer=${activeLayer.value}`);
                let obj = await res.json();
                if (rectangles.some(e => e === overlay) === false) {
                    rectangles.push(overlay);
                }
                bindPopup(overlay, obj.mean[0]);
            }

            async function handleShp(overlay) {
                handleGeoJSON(overlay)
            }

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

            let results = [];

            $('#searchPrompt')
                .dropdown({
                    forceSelection: true,
                    searchDelay: 500,
                    apiSettings: {
                        url: 'https://nominatim.openstreetmap.org/search.php?q={query}&format=jsonv2',
                        onResponse: function (res) {
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
                let res = await fetch(`https://nominatim.openstreetmap.org/details.php?place_id=${value}&format=json&polygon_geojson=1`);
                let result = await res.json();

                let bbox = result.boundingbox;
                let layer = L.geoJSON(result.geometry).addTo(map);
                map.fitBounds(layer.getBounds());
                handleGeoJSON(layer);
                document.activeElement.blur();
            }
            $('#searchPrompt').onselect = changedValue;

            async function handleGeoJSON(layer) {
                let res = await fetch(`${location.href.match(/(http:\/\/.*?)(:\d+)?\//)[1]}:9000/geojson?layer=${activeLayer.value}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        "geojson": layer.toGeoJSON()
                    })
                });
                let obj = await res.json();
                if (shapes.some(e => e == layer) === false)
                    shapes.push(layer);
                bindPopup(layer, obj.mean[0]);
            }

            map.on('baselayerchange', function (e) {
                // e.layer is the selected base layer
                $(".leaflet-control-layers-base > label > span > span").each((i, el) => { if (el.innerText == e.name) { el.classList.add('checked'); } else { el.classList.remove('checked'); } });
            });

        })



        Vue.watch(opacity, function () {
            overleafLayersRef.value[activeLayer.value].setOpacity(opacity.value / 100.0);
        })

        const expandLayers = ref(false);
        return {
            activeLayer,
            activeBaseLayer,
            expandLayers,
            overleafLayersRef,
            layersRef,
            mapRef,
            opacity,
        };
    }
}).use(vuetify).mount('#app')
