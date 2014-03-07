/*
 * NASA Worldview
 *
 * This code was originally developed at NASA/Goddard Space Flight Center for
 * the Earth Science Data and Information System (ESDIS) project.
 *
 * Copyright (C) 2013 - 2014 United States Government as represented by the
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

var wv = wv || {};

wv.map = wv.map || function(models, config) {

    var self = {};

    var id = "map";
    var selector = "#" + id;

    // When the date changes, save the layer so that the tiles remain
    // cached.
    var layerCache = new Cache(50);

    // One map for each projection
    self.proj = {};

    // The map for the selected projection
    self.selected = null;

    var init = function() {
        $.each(config.projections, function(k, proj) {
            var map = createMap(proj);
            self.proj[proj.id] = map;
        });

        models.proj.events.on("select", updateProjection);
        models.layers.events.on("add", addLayer);
        models.layers.events.on("remove", removeLayer);
        models.layers.events.on("visibility", updateVisibility);
        models.layers.events.on("update", moveLayer);
        models.date.events.on("select", updateDate);

        updateProjection();
    };

    var createMap = function(proj) {
        var target = id + "-" + proj.id;
        var $proj = $("<div></div>")
            .attr("id", target)
            .attr("data-projection", proj.id)
            .addClass("map");
        $(selector).append($proj);
        var scaleControl = new ol.control.ScaleLine();
        var view = new ol.View2D({
            projection: ol.proj.get(proj.crs),
            center: proj.startCenter,
            zoom: proj.startZoom,
            maxResolution: proj.resolutions[0],
            extent: proj.maxExtent
        });
        var map = new ol.Map({
            view: view,
            renderer: ["webgl", "canvas", "dom"],
            target: target,
            controls: ol.control.defaults().extend([
                /*
                new ol.control.FullScreen({
                    target: document.getElementById("full-screen")
                })
                */
                scaleControl
            ])
        });
        map.worldview = {
            proj: proj,
            scaleControl: scaleControl,
            scaleActive: true
        };
        view.on("change:center", onMapMove);
        $proj.hide();

        return map;
    };

    var createLayer = function(layer, proj) {
        var key = layerKey(proj, layer, models.date.selected);
        var mapLayer = layerCache.getItem(key);
        if ( !mapLayer ) {
            if ( layer.type === "wmts" ) {
                mapLayer = createLayerWMTS(layer, proj);
            } else if ( layer.type === "wms" ) {
                mapLayer = createLayerWMS(layer, proj);
            } else {
                throw new Error("Unknown layer type: " + layer.type);
            }
            mapLayer.worldview = {
                layer: layer,
                date: models.date.selected
            };
            layerCache.setItem(key, mapLayer);
        }
        return mapLayer;
    };

    var createLayerWMTS = function(layer, proj) {
        var matrixSetName = layer.projections[proj.id].matrixSet;
        var matrixSet = config.matrixSets[matrixSetName];
        var sourceName = layer.projections[proj.id].source;
        var source = config.sources[sourceName];

        var wmts = new ol.source.WMTS({
            urls: source.url,
            layer: layer.id,
            matrixSet: matrixSet.id,
            format: layer.format,
            projection: ol.proj.get(proj.crs),
            tileGrid: new ol.tilegrid.WMTS({
                origin: matrixSet.origin,
                resolutions: matrixSet.resolutions,
                matrixIds: matrixSet.matrixIds,
                tileSize: matrixSet.tileSize
            }),
            extent: proj.maxExtent,
            style: "default",
            crossOrigin: "anonymous"
        });

        wmts.tileUrlFunction = tileUrlFunction(wmts, wmts.tileUrlFunction,
                models.date.selected);
        var mapLayer = new ol.layer.Tile({source: wmts, visible: false});
        return mapLayer;
    };

    var createLayerWMS = function(layer, proj) {
        var matrixSetName = layer.projections[proj.id].matrixSet;
        var matrixSet = config.matrixSets[matrixSetName];
        var sourceName = layer.projections[proj.id].source;
        var source = config.sources[sourceName];

        var params = {
            "VERSION": "1.1.1",
            "LAYERS": layer.id,
            "FORMAT": layer.format
        };
        if ( layer.period === "daily" ) {
            params.TIME = wv.util.toISOStringDate(models.date.selected);
        }
        if ( layer.format === "image/png") {
            params.TRANSPARENT = "true";
        }
        var wms = new ol.source.TileWMS({
            urls: source.url,
            params: params,
            extent: proj.maxExtent,
            projection: ol.proj.get(proj.crs),
            serverType: "mapserver",
        });

        return new ol.layer.Tile({source: wms, visible: true});
    };

    var updateProjection = function() {
        if ( self.selected ) {
            hideMap(self.selected);
        }
        self.selected = self.proj[models.proj.selected.id];
        refreshLayers();
        showMap(self.selected);
    };

    var hideMap = function(map) {
        var mapLayers = map.getLayers();
        mapLayers.forEach(function(mapLayer) {
            mapLayer.setVisible(false);
        });
        var proj = map.worldview.proj;
        $("#map [data-projection='" + proj.id + "']").hide();
    };

    var showMap = function(map) {
        var proj = map.worldview.proj;
        $("#map [data-projection='" + proj.id + "']").show();
        var mapLayers = map.getLayers();
        mapLayers.forEach(function(mapLayer) {
            if ( models.layers.visible[mapLayer.worldview.layer.id] ) {
                mapLayer.setVisible(true);
            }
        });
    };

    var addLayer = function(layer) {
        var newMapLayer = createLayer(layer, models.proj.selected);
        newMapLayer.setVisible(true);
        var map = self.selected;
        if ( layer.group === "baselayers" ) {
            var iter = map.getLayers().getArray().slice();
            var addIndex = 0;
            var found = false;
            _.each(iter, function(mapLayer, index) {
                if ( !found && mapLayer.worldview.layer.group === "overlays" ) {
                    addIndex = index;
                    found = true;
                }
            });
            if ( !found ) {
                addIndex = iter.length;
            }
            map.getLayers().insertAt(addIndex, newMapLayer);
        } else {
            map.addLayer(newMapLayer);
        }
    };

    var removeLayer = function(layer) {
        var mapLayers = self.selected.getLayers();
        var iter = new ol.Collection(mapLayers.getArray());
        iter.forEach(function(mapLayer) {
            if ( layer.id === mapLayer.worldview.layer.id ) {
                mapLayers.remove(mapLayer);
            }
        });
    };

    var updateVisibility = function(layer, visible) {
        var mapLayers = self.selected.getLayers();
        mapLayers.forEach(function(mapLayer) {
            if ( layer.id === mapLayer.worldview.layer.id ) {
                mapLayer.setVisible(visible);
            }
        });
    };

    var updateDate = function() {
        _.each(self.proj, function(map) {
            var mapLayers = map.getLayers();
            var iter = mapLayers.getArray().slice();
            _.each(iter, function(mapLayer, index) {
                var layer = mapLayer.worldview.layer;
                if ( layer.period === "daily" ) {
                    var newMapLayer = createLayer(layer, map.worldview.proj);
                    if ( models.layers.visible[layer.id] ) {
                        newMapLayer.setVisible(true);
                    }
                    var oldMapLayer = mapLayers.getAt(index);
                    mapLayers.insertAt(index, newMapLayer);
                    map.removeLayer(oldMapLayer);
                }
            });
        });
    };

    var refreshLayers = function(map) {
        map = map || self.selected;
        var proj = map.worldview.proj;
        map.getLayers().clear();

        var layers = models.layers.get({proj: proj.id, reverse: true});
        _.each(layers, function(layer) {
            var mapLayer = createLayer(layer, proj);
            if ( models.layers.visible[layer.id] ) {
                mapLayer.setVisible(true);
            }
            map.addLayer(mapLayer);
        });
    };

    var moveLayer = function() {
        refreshLayers();
    };

    var onMapMove = function() {
        var map = self.selected;
        var center = map.getView().getCenter();
        var extent = map.getView().getProjection().getExtent();
        var active = center[0] > extent[0] && center[0] < extent[2] &&
                     center[1] > extent[1] && center[1] < extent[3];
        if ( active !== map.worldview.scaleActive ) {
            if ( active ) {
                map.addControl(map.worldview.scaleControl);
            } else {
                map.removeControl(map.worldview.scaleControl);
            }
            map.worldview.scaleActive = active;
        }
    };

    var layerKey = function(proj, layer, date) {
        return proj.id + ":" + layer.id + ":" + date.getTime();
    };

    var tileUrlFunction = function(context, delegate, date) {
        return function() {
            var url = delegate.apply(context, arguments);
            if ( !url ) {
                return;
            }
            var parts = url.split("?");
            var location = parts[0];
            var queryString = parts[1];
            var params = wv.util.fromQueryString(queryString);

            queryString =
                "SERVICE=" + params.Service + "&" +
                "REQUEST=" + params.Request + "&" +
                "VERSION=" + params.Version + "&" +
                "LAYER=" + params.Layer + "&" +
                "STYLE=&" +
                "TILEMATRIXSET=" + params.TileMatrixSet + "&" +
                "TILEMATRIX=" + params.TileMatrix + "&" +
                "TILEROW=" + params.TileRow + "&" +
                "TILECOL=" + params.TileCol + "&" +
                "FORMAT=" + encodeURIComponent(params.Format) + "&" +
                "TIME=" + wv.util.toISOStringDate(date);

            newUrl = location + "?" + queryString;
            return newUrl;
        };
    };

    init();
    return self;

};

