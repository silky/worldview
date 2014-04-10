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

/**
 * @module wv.data
 */
var wv = wv || {};
wv.data = wv.data || {};

wv.data.layers = wv.data.layers || {};

wv.data.layers.button = wv.data.layers.button || function(model, maps, config) {

    var LAYER_NAME = "DataDownload_Button";

    var IMAGE_SELECT = "images/data-download-plus-button-orange.svg";
    var IMAGE_UNSELECT = "images/data-download-minus-button-red.svg";

    /*
    var STYLE = {
        "default": {
            externalGraphic: IMAGE_SELECT,
            fontFamily: "helvetica, sans-serif",
            fontColor: "#ffffff",
            fontWeight: "bold",
            labelOutlineColor: "black",
            labelOutlineWidth: 2,
            labelOutlineOpacity: 0.7,
            label: "${label}",
            cursor: "pointer"
        },
        "select": {
            externalGraphic: IMAGE_UNSELECT,
            fontFamily: "helvetica, sans-serif",
            fontColor: "#ffffff",
            fontWeight: "bold",
            labelOutlineColor: "black",
            labelOutlineWidth: 2,
            labelOutlineOpacity: 0.7,
            label: "${label}",
            cursor: "pointer"
        }
    };
    */

    var map = null;
    var layer = null;
    var selectedLayer = null;
    var styles = [];
    var selectedStyles = [];
    var results = [];
    var features = {};
    var selectedFeatures = {};
    var splitFeature = null;
    var self = {};

    self.EVENT_HOVER_OVER = "hoverover";
    self.EVENT_HOVER_OUT = "hoverout";

    self.events = wv.util.events();

    var init = function() {
        model.events.on("granuleUnselect", onUnselect);
    };

    var reinit = function() {
        mapDispose();

        map = maps.selected;
        //map.on("singleclick", onClick);
        $(map.getViewport()).click(onClick);

        var projId = model.projection;
        var resolutions = config.projections[projId].resolutions;
        for ( var zoom = 0; zoom < resolutions.length; zoom++ ) {
            styles[zoom] = new ol.style.Style({
                image: new ol.style.Icon({
                    src: IMAGE_SELECT,
                    size: getSize(zoom)
                })
            });
            selectedStyles[zoom] = new ol.style.Style({
                image: new ol.style.Icon({
                    src: IMAGE_UNSELECT,
                    size: getSize(zoom)
                })
            });
        }
        layer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: []
            }),
            style: function(feature, resolution) {
               var zoom = wv.map.zoomForResolution(resolution, resolutions);
               return [styles[zoom]];
            }
        });
        map.addLayer(layer);

        selectedLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: []
            }),
            style: function(feature, resolution) {
               var zoom = wv.map.zoomForResolution(resolution, resolutions);
               return [selectedStyles[zoom]];
            }
        });
        map.addLayer(selectedLayer);
    };

    var getSize = function(zoom) {
        // Minimum size of the button is 15 pixels
        var base = 15;
        // Double the size for each zoom level
        var add = Math.pow(2, zoom);
        // But 47 pixels is the maximum size
        var size = Math.min(base + add, base + 32);
        return [size, size];
    };

    var mapDispose = function() {
        if ( !map ) {
            return;
        }
        map.removeLayer(layer);
        map.removeLayer(selectedLayer);
        map.un("singleclick", onClick);
    };

    var onClick = function(evt) {
        console.log("begin");
        //var pixel = evt.pixel;
        var pixel = map.getEventPixel(evt.originalEvent);
        maps.selected.forEachFeatureAtPixel(pixel, function(feature, layer) {
            console.log(feature);
            if ( selectedFeatures[feature.granule.id] ) {
                console.log("remove");
                layer.getSource().addFeature(feature);
                selectedLayer.getSource().removeFeature(feature);
                delete selectedFeatures[feature.granule.id];
            } else {
                console.log("add");
                selectedLayer.getSource().addFeature(feature);
                layer.getSource().removeFeature(feature);
                selectedFeatures[feature.granule.id] = feature;
            }
        });
        console.log("end");
    };

    self.update = function(results) {
        if ( map !== maps.selected ) {
            reinit();
        }
        var source = layer.getSource();
        wv.map.clearFeatures(layer.getSource());
        wv.map.clearFeatures(selectedLayer.getSource());

        features = {};
        selectedFeatures = {};
        _.each(results.granules, function(granule) {
            if ( !granule.centroid ) {
                return;
            }
            var centroid = granule.centroid[model.crs];
            if ( centroid ) {
                var feature = new ol.Feature(centroid);
                feature.granule = granule;
                if ( model.selectedGranules[granule.id] ) {
                    selectedFeatures[granule.id] = feature;
                } else {
                    features[granule.id] = feature;
                }
            }
        });

        layer.getSource().addFeatures(_.values(features));
        selectedLayer.getSource().addFeatures(_.values(selectedFeatures));

        /*
        var selectionControl = layer.selectionControl;
        $.each(selectedFeatures, function(index, selectedFeature) {
            selectionControl.select(selectedFeature);
        });
        */
    };

    self.clear = function() {
        /*
        var layer = wv.map.getLayerByName(maps.map, LAYER_NAME);
        if ( layer ) {
            features = {};
            layer.removeAllFeatures();
        }
        */
    };

    self.dispose = function() {
        /*
        $.each(maps, function(index, map) {
            var layer = wv.map.getLayerByName(map, LAYER_NAME);
            if ( layer ) {
                map.removeControl(layer.hoverControl);
                map.removeControl(layer.selectionControl);
                map.removeLayer(layer);
            }
        });
        */
    };

    var createLayer = function() {
        size = getSize();

        layer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: []
            }),
            style: getStyle()
        });
        layer.name = LAYER_NAME;
        maps.selected.addLayer(layer);

        /*
        layer.events.on({
            'featureselected': function(event) {
                model.selectGranule(event.feature.attributes.granule);
            },
            'featureunselected': function(event) {
                model.unselectGranule(event.feature.attributes.granule);
            }
        });
        */

        /*
        var hoverControl = new wv.map.HoverControl(layer);
        hoverControl.events.on({
            "hoverover": function(event) {
                self.events.trigger(self.EVENT_HOVER_OVER, event);
                onHoverOver(event);
            },
            "hoverout": function(event) {
                self.events.trigger(self.EVENT_HOVER_OUT, event);
                onHoverOut(event);
            }
        });
        maps.map.addControl(hoverControl);
        hoverControl.activate();
        layer.hoverControl = hoverControl;

        var selectionControl = new OpenLayers.Control.SelectFeature(layer, {
            autoActivate: true,
            toggle: true,
            multiple: true,
            clickout: false
        });
        maps.map.addControl(selectionControl);
        layer.selectionControl = selectionControl;
        */
        return layer;
    };

    var getLayer = function(map) {
        map = map || maps.selected;
        var layer = wv.map.getLayerByName(map, LAYER_NAME);
        if ( !layer ) {
            layer = createLayer();
        }
        return layer;
    };



    var resize = function() {
        if ( !model.active ) {
            return;
        }
        var styleMap = new OpenLayers.StyleMap(getStyle());
        getLayer().styleMap = styleMap;
        layer.redraw();
    };

    var onUnselect = function(granule) {
        var feature = features[granule.id];
        if ( feature ) {
            getLayer().selectionControl.unselect(feature);
        }
    };

    var onHoverOver = function(event) {
        var feature = event.feature;
        var granule = feature.attributes.granule;
        feature.attributes.label = granule.label;
        getLayer().drawFeature(feature);
        if ( feature.geometry.CLASS_NAME ===
                "OpenLayers.Geometry.MultiPoint" ) {
            var newStyle = $.extend(true, {}, getStyle("default"));
            delete newStyle.externalGraphic;
            newStyle.strokeOpacity = 1;
            newStyle.fillOpacity = 1;
            newStyle.label = granule.label;
            splitFeature = new OpenLayers.Feature.Vector(
                feature.geometry.components[1].clone(),
                feature.attributes,
                newStyle
            );
            getLayer().addFeatures([splitFeature]);
        }
    };

    var onHoverOut = function(event) {
        var feature = event.feature;
        feature.attributes.label = "";
        getLayer().drawFeature(feature);
        if ( splitFeature ) {
            getLayer().removeFeatures([splitFeature]);
            splitFeature = null;
        }
    };

    var getLabelOffset = function() {
        var buttonHeight = getSize().h;
        return ( buttonHeight / 2.0 ) + 10;
    };

    init();
    return self;

};


wv.data.layers.grid = wv.data.layers.grid || function(model, maps, config) {

    var LAYER_NAME = "DataDownload_Grid";
    var STYLE = {
        strokeColor: "#bab498",
        strokeOpacity: 0.6,
        fillOpacity: 0,
        strokeWidth: 1.5
    };

    //var parser = new OpenLayers.Format.GeoJSON();
    var parser = null;

    var self = {};

    self.update = function(results) {
        self.clear();
        var grid = results.meta.grid;
        if ( !grid ) {
            return;
        }
        var layer = getLayer();

        var features = [];
        $.each(grid, function(index, cell) {
            var geom = parser.read(cell.geometry, "Geometry");
            var feature = new OpenLayers.Feature.Vector(geom);
            features.push(feature);
        });
        layer.addFeatures(features);
    };

    self.clear = function() {
        var layer = wv.map.getLayerByName(maps.map, LAYER_NAME);
        if ( layer ) {
            layer.removeAllFeatures();
        }
    };

    self.dispose = function() {
        $.each(maps, function(index, map) {
            var layer = wv.map.getLayerByName(map, LAYER_NAME);
            if ( layer ) {
                map.removeLayer(layer);
            }
        });
    };

    var createLayer = function() {
        var layer = new OpenLayers.Layer.Vector(LAYER_NAME, {
            styleMap: new OpenLayers.StyleMap(STYLE)
        });
        layer.div.setAttribute("data-layer-name", LAYER_NAME);
        maps.map.addLayer(layer);
        return layer;
    };

    var getLayer = function(map) {
        map = map || maps.map;
        var layer = wv.map.getLayerByName(map, LAYER_NAME);
        if ( !layer ) {
            layer = createLayer();
        }
        return layer;
    };

    return self;

};


wv.data.layers.hover = wv.data.layers.hover || function(model, maps, config) {

    var LAYER_NAME = "DataDownload_Hover";

    var STYLE_HOVER_UNSELECTED = {
        strokeColor: "#fbe26d",
        fillColor: "#b59e32",
        fillOpacity: 0.25
    };

    var STYLE_HOVER_SELECTED = {
        strokeColor: "#ff0600",
        fillColor: "#f20c0c",
        fillOpacity: 0.25,
    };

    var self = {};

    var init = function() {
        model.events
            .on("granuleSelect", refresh)
            .on("granuleUnselect", refresh);
    };

    self.hoverOver = function(granule) {
        if ( !granule.geometry ) {
            return;
        }
        var geom = granule.geometry[model.crs];
        var extent =
                config.projections[model.projection].maxExtent.toGeometry();
        if ( geom && extent.intersects(geom) ) {
            var hoverFeature = new OpenLayers.Feature.Vector(
                granule.geometry[model.crs], {
                    granule: granule
                }
            );
            applyStyle(hoverFeature);
            getLayer().addFeatures([hoverFeature]);
        }
    };

    self.hoverOut = function() {
        self.clear();
    };

    self.clear = function() {
        var layer = wv.map.getLayerByName(maps.map, LAYER_NAME);
        if ( layer ) {
            layer.removeAllFeatures();
        }
    };

    self.dispose = function() {
        $.each(maps.projections, function(index, map) {
            var layer = wv.map.getLayerByName(map, LAYER_NAME);
            if ( layer ) {
                map.removeLayer(layer);
            }
        });
    };

    var refresh = function(granule) {
        var layer = getLayer();
        if ( layer.features.length === 0 ) {
            return;
        }
        var feature = layer.features[0];
        var hoverGranule = feature.attributes.granule;
        if ( hoverGranule.id === granule.id ) {
            applyStyle(feature);
            layer.drawFeature(feature);
        }
    };

    var applyStyle = function(feature) {
        var granule = feature.attributes.granule;
        var selected = model.selectedGranules[granule.id];
        var style = ( selected ) ? STYLE_HOVER_SELECTED: STYLE_HOVER_UNSELECTED;
        feature.style = style;
    };

    var createLayer = function() {
        var layer = new OpenLayers.Layer.Vector(LAYER_NAME);
        layer.div.setAttribute("data-layer-name", LAYER_NAME);
        maps.map.addLayer(layer);
        return layer;
    };

    var getLayer = function(map) {
        map = map || maps.map;
        var layer = wv.map.getLayerByName(map, LAYER_NAME);
        if ( !layer ) {
            layer = createLayer();
        }
        return layer;
    };

    init();
    return self;

};


wv.data.layers.selection = wv.data.layers.selection || function(model, maps, config) {

    var LAYER_NAME = "DataDownload_Selection";

    var OPACITY = 0.6;
    var STYLE = {
        strokeColor: "#808080",
        fillColor: "#808080",
    };

    var self = {};
    var features = {};

    var init = function() {
        model.events
            .on("granuleSelect", onGranuleSelect)
            .on("granuleUnselect", onGranuleUnselect);
    };

    self.clear = function() {
        var layer = wv.map.getLayerByName(maps.map, LAYER_NAME);
        if ( layer ) {
            layer.removeAllFeatures();
        }
    };

    self.dispose = function() {
        $.each(maps.projections, function(index, map) {
            var layer = wv.map.getLayerByName(map, LAYER_NAME);
            if ( layer ) {
                map.removeLayer(layer);
            }
        });
        features = {};
    };

    self.select = function(granule) {
        onGranuleSelect(granule);
    };

    var onGranuleSelect = function(granule) {
        if ( !granule.geometry ) {
            return;
        }
        var geom = granule.geometry[model.crs];
        var extent =
                config.projections[model.projection].maxExtent.toGeometry();
        if ( geom && extent.intersects(geom) ) {
            // Exit if already selected
            if ( features[granule.id] ) {
                return;
            }
            var feature = new OpenLayers.Feature.Vector(geom.clone());
            features[granule.id] = feature;
            getLayer().addFeatures([feature]);
        }
    };


    var onGranuleUnselect = function(granule) {
        if ( !granule.geometry ) {
            return;
        }
        var feature = features[granule.id];
        if ( !feature ) {
            return;
        }
        getLayer().removeFeatures([feature]);
        getLayer().redraw();
        delete features[granule.id];
    };

    self.refresh = function() {
        self.clear();
        features = {};
        $.each(model.selectedGranules, function(index, granule) {
            self.select(granule);
        });
    };

    var createLayer = function() {
        layer = new OpenLayers.Layer.Vector(LAYER_NAME, {
            styleMap: new OpenLayers.StyleMap(STYLE)
        });
        layer.div.setAttribute("data-layer-name", LAYER_NAME);
        layer.setOpacity(OPACITY);
        maps.map.addLayer(layer);

        return layer;
    };

    var getLayer = function(map) {
        map = map || maps.map;
        var layer = wv.map.getLayerByName(map, LAYER_NAME);
        if ( !layer ) {
            layer = createLayer();
        }
        return layer;
    };

    init();
    return self;

};


wv.data.layers.swath = function(model, maps, config) {

    var LAYER_NAME = "DataDownload_Swaths";
    var STYLE = {
        strokeColor: "#c3bd7b",
        strokeOpacity: 0.75,
        strokeWidth: 2
    };
    var MAX_DISTANCE_GEO = 270;

    var self = {};

    self.update = function(results) {
        self.clear();
        var swaths = results.meta.swaths;
        if ( !swaths ) {
            return;
        }
        var layer = getLayer();

        var maxDistance = ( model.crs === wv.map.CRS_WGS_84 ) ?
                MAX_DISTANCE_GEO : Number.POSITIVE_INFINITY;

        var features = [];
        $.each(swaths, function(index, swath) {
            var lastGranule = null;
            // Main granules or west side granuels
            $.each(swath, function(index, granule) {
                if ( !lastGranule ) {
                    lastGranule = granule;
                    return;
                }
                var polys1 = wv.map.toPolys(lastGranule.geometry[model.crs]);
                var polys2 = wv.map.toPolys(granule.geometry[model.crs]);
                $.each(polys1, function(index1, poly1) {
                    $.each(polys2, function(index2, poly2) {
                        var c1 = poly1.getCentroid();
                        var c2 = poly2.getCentroid();
                        var distanceX = wv.map.distanceX(c1, c2);
                        if ( distanceX < maxDistance ) {
                            features.push(new OpenLayers.Feature.Vector(
                                new OpenLayers.Geometry.LineString([c1, c2])
                            ));
                        }
                    });
                });
                lastGranule = granule;
            });

        });
        layer.addFeatures(features);
    };

    self.clear = function() {
        var layer = wv.map.getLayerByName(maps.map, LAYER_NAME);
        if ( layer ) {
            layer.removeAllFeatures();
        }
    };

    self.dispose = function() {
        $.each(maps.projections, function(index, map) {
            var layer = wv.map.getLayerByName(map, LAYER_NAME);
            if ( layer ) {
                map.removeLayer(layer);
            }
        });
    };

    var createLayer = function() {
        var layer = new OpenLayers.Layer.Vector(LAYER_NAME, {
            styleMap: new OpenLayers.StyleMap(STYLE)
        });
        layer.div.setAttribute("data-layer-name", LAYER_NAME);
        maps.map.addLayer(layer);
        return layer;
    };

    var getLayer = function(map) {
        map = map || maps.map;
        var layer = wv.map.getLayerByName(map, LAYER_NAME);
        if ( !layer ) {
            layer = createLayer();
        }
        return layer;
    };

    return self;
};
