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
            extent.push(parseFloat(part));
        });
        return extent;
    };

    return self;

}(wv.map || {});
