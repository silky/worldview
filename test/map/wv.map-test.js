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

buster.testCase("wv.map", {

    errors: null,

    setUp: function() {
        this.errors = [];
    },

    "Parses state": function() {
        var state = { map: "0,1,2,3" };
        wv.map.parse(state, this.errors);
        buster.assert.equals(state.map[0], 0);
        buster.assert.equals(state.map[1], 1);
        buster.assert.equals(state.map[2], 2);
        buster.assert.equals(state.map[3], 3);
        buster.assert.equals(this.errors.length, 0);
    },

    "Error on invalid extent": function() {
        var state = { map: "0,1,x,3" };
        wv.map.parse(state, this.errors);
        buster.refute(state.map);
        buster.assert.equals(this.errors.length, 1);
    },

    "Error on too few values in extent": function() {
        var state = { map: "1,2,3" };
        wv.map.parse(state, this.errors);
        buster.refute(state.map);
        buster.assert.equals(this.errors.length, 1);
    },

    "Extent on point": function() {
        var p = new ol.geom.Point([1, 2]);
        var ex = wv.map.extent(p);
        buster.assert.equals(ex[0], 1);
        buster.assert.equals(ex[1], 2);
        buster.assert.equals(ex[2], 1);
        buster.assert.equals(ex[3], 2);
    },

    "Extent on polygon": function() {
        var p = new ol.geom.Polygon(
            [[[-2, -4], [-2, 4], [2, 4], [2, -4], [-2, -4]]]
        );
        var ex = wv.map.extent(p);
        buster.assert.equals(ex[0], -2);
        buster.assert.equals(ex[1], -4);
        buster.assert.equals(ex[2], 2);
        buster.assert.equals(ex[3], 4);
    },

    "Extents intersect": function() {
        buster.assert(wv.map.intersectsExtents(
            [-2, -2, 2, 2],
            [-1, -1, 3, 3]
        ));
    },

    "Extents do not intersect": function() {
        buster.refute(wv.map.intersectsExtents(
            [-2, -2, 2, 2],
            [3, 3, 4, 4]
        ));
    },

    "Valid polygon": function() {
        var p = new ol.geom.Polygon(
            [[[-10, -10], [-10, 10], [10, 10], [10, -10], [-10, -10]]]
        );
        buster.assert(wv.map.isPolygonValid(p, 50));
    },

    "Invalid polygon": function() {
        var p = new ol.geom.Polygon(
            [[[-10, -10], [-10, 10], [10, 10], [10, -10], [-10, -10]]]
        );
        buster.refute(wv.map.isPolygonValid(p, 5));
    }

});
