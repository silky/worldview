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

wv.map = function(self) {

    self.CRS_WGS_84 = "EPSG:4326";
    self.CRS_WGS_84_QUERY_EXTENT = new ol.geom.Polygon(
        [[[-180, -60], [180, -60], [180, 60], [-180, 60], [-180, -60]]]
    );

    self.parse = function(state, errors) {
        if ( state.map ) {
            try {
                state.map = self.parseExtent(state.map);
            } catch ( error ) {
                errors.push({
                    message: "Invalid extent: " + state.map,
                    cause: error
                });
                delete state.map;
            }
        }
    };

    self.parseExtent = function(str) {
        var parts = str.split(",");
        if ( parts.length !== 4 ) {
            throw new Error("Invalid number of coordinates");
        }
        var extent = [];
        _.each(parts, function(part) {
            var f = parseFloat(part);
            if ( _.isNaN(f) ) {
                throw new Error("Invalid value: " + part);
            }
            extent.push(f);
        });
        return extent;
    };

    self.extent = function(geom) {
        var minX = Number.MAX_VALUE;
        var minY = Number.MAX_VALUE;
        var maxX = -Number.MAX_VALUE;
        var maxY = -Number.MAX_VALUE;

        var listIter = function(list) {
            _.each(list, function(item, index) {
                if ( item.length ) {
                    listIter(item);
                } else {
                    if ( index === 0 ) {
                        minX = Math.min(minX, item);
                        maxX = Math.max(maxX, item);
                    } else if ( index === 1 ) {
                        minY = Math.min(minY, item);
                        maxY = Math.max(maxY, item);
                    }
                }
            });
        };
        listIter(geom.getCoordinates());
        return [minX, minY, maxX, maxY];
    };

    self.intersectsExtents = function(a, b) {
        return !(a[2] < b[0] || b[2] < a[0] || a[3] < b[1] || b[3] < a[1]);
    };

    self.getLayerByName = function(map, name) {
        _.each(map.getLayers().getArray(), function(layer) {
            if ( layer.name === name ) {
                return layer;
            }
        });
    };

    self.clearFeatures = function(vectorSource) {
        var features = vectorSource.getFeatures();
        _.each(features, function(feature) {
            vectorSource.removeFeature(feature);
        });
    };

    self.isPolygonValid = function(polygon, maxDistance) {
        var outerRing = polygon.getLinearRings()[0].getCoordinates();
        for ( var i = 0; i < outerRing.length - 1; i++ ) {
            var x1 = outerRing[i][0];
            var x2 = outerRing[i + 1][0];
            if ( Math.abs(x1 - x2) > maxDistance ) {
                return false;
            }
        }
        return true;
    };

    self.adjustAntiMeridian = function(polygon, adjustSign) {
        var points = polygon.getLinearRings()[0].getCoordinates();
        for ( var i = 0; i < points.length; i++ ) {
            if ( adjustSign > 0 && points[i][0] < 0 ) {
                points[i][0] = points[i][0] + 360;
            }
            if ( adjustSign < 0 && points[i][0] > 0 ) {
                points[i][0] = points[i][0] - 360;
            }
        }
        return new ol.geom.Polygon([points]);
    };

    self.zoomForResolution = function(resolution, resolutions) {
        for ( var zoom = 0; zoom < resolutions.length; zoom++ ) {
            if ( resolution === resolutions[zoom] ) {
                return zoom;
            }
        }
    };

    return self;

}(wv.map || {});
