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

var gibs = gibs || {};

(function() {
    var clearTimeUTC = function(date) {
        date.setUTCHours(0);
        date.setUTCMinutes(0);
        date.setUTCSeconds(0);
        date.setUTCMilliseconds(0);
        return date;
    };

    var today = function() {
        return clearTimeUTC(new Date());
    };

    var dateString = function(date) {
        return date.toISOString().split("T")[0];
    };

    gibs.ol = gibs.ol || {};
    gibs.ol.source = gibs.ol.source || {};

    gibs.ol.source.wmts = gibs.ol.source.wmts || function(options) {

        var date = today();
        var self = new ol.source.WMTS(options);

        var parent = {
            tileUrlFunction: self.tileUrlFunction
        };

        var urlTileFunction = function() {
            var url = parent.tileUrlFunction.apply(self, arguments);
            if ( url ) {
                return url + "&TIME=" + dateString(date);
            }
        }
        self.tileUrlFunction = urlTileFunction;

        self.setDate = function(newDate) {
            date = newDate;
            self.setTileUrlFunction(urlTileFunction);
        };

        self.getDate = function() {
            return date;
        };

        return self;
    };

})();
