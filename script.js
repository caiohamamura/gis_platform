

const { ref, onCreated, onMounted } = Vue;
Vue.createApp({
    setup() {
        const activeLayer = ref();
        const layersRef = ref();
        const mapRef = ref();
        const overleafLayersRef = ref();
        const searchLayer = ref();

        onMounted(async () => {
            const layers = await (await fetch('layers.json')).json();
            layersRef.value = layers;
            const initLayer = Object.keys(layers)[0];
            console.log(initLayer);
            activeLayer.value = initLayer;

            let osm = L.tileLayer(
                'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                minZoom: 0,
                maxZoom: 18,
            });






            let createArrayUpToIndex = (index) => Array.from(Array(index + 1).keys());

            let overleafLayers = {};
            let map;

            for (const l in layers) {
                const layer = layers[l];
                overleafLayers[l] =
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
            }

            overleafLayersRef.value = overleafLayers;



            map = L.map('map', {
                crs: L.CRS.EPSG3857,
                pmIgnore: false,
                layers: [overleafLayers['gedi_carbon']],
                zoomControl: false,
            }).setView([40, -90], 3);

            mapRef.value = map;

            map.createPane('basePane');
            map.getPane('basePane').style.zIndex = 199;

            let landsat = L.esri
                .imageMapLayer({
                    url: "https://landsat.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer",
                    pane: 'basePane',
                    attribution: "United States Geological Survey (USGS), National Aeronautics and Space Administration (NASA)"
                });


            var baseMaps = {
                "OpenStreetMap": osm.addTo(map),
                "Landsat": landsat
            };

            // Allow drawing rectangle
            let overlays = [];

            var layerControl = L.control.layers(baseMaps, overleafLayers, options = {
                "collapsed": false,
                position: 'topleft'
            }).addTo(map);
            var zoomControl = L.control.zoom().addTo(map);


            // ALLOW ONLY ONE TO BE SELECTED
            // Get the overlay container element
            const overlayContainer = layerControl.getContainer();

            // Get all the overlay input elements
            const overlayInputs = overlayContainer.querySelectorAll('input[type="checkbox"]');



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
                        res = await fetch(`http://localhost:9000/api?bbox=${overlay.getBounds().toBBoxString()}&layer=${activeLayer.value}`)
                        obj = await res.json();
                        bindPopup(overlay, obj.mean[0]);
                        break;
                    case 'Polygon':
                        //console.log('Polygon');
                        //console.log(event);
                        let wkt = convertLatLngToWKT(event.layer.getLatLngs()[0]);
                        res = await fetch(`http://localhost:9000/polygon?${new URLSearchParams({
                            wkt: wkt,
                            layer: activeLayer.value
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
                        formData.append('layer', activeLayer.value);
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
                    searchLayer.value?.remove();
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
                searchLayer.value?.remove();
                searchLayer.value = L.geoJSON(result.geometry).addTo(map);
                map.fitBounds(searchLayer.value.getBounds());
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
                bindPopup(searchLayer.value, obj.mean[0]);
            }

            map.on('baselayerchange', function (e) {
                // e.layer is the selected base layer
                $(".leaflet-control-layers-base > label > span > span").each((i, el) => { if (el.innerText == e.name) { el.classList.add('checked'); } else { el.classList.remove('checked'); } });
            });

        })



        function setActiveLayer(layer) {
            overleafLayersRef.value?.[activeLayer.value]?.remove();
            if (layer != activeLayer.value) {
                overleafLayersRef.value?.[layer]?.addTo(mapRef.value);
                activeLayer.value = layer;
            } else {
                activeLayer.value = '';
            }

        }

        const expandLayers = ref(true);

        return {
            setActiveLayer,
            activeLayer,
            expandLayers,
            overleafLayersRef,
            layersRef,
            mapRef,
        };
    }
}).mount('#app')