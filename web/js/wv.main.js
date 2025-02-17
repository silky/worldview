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

var wvx = wvx || {};

$(function() {

    var config;
    var state = wv.util.fromQueryString(location.search);
    var parameters = wv.util.fromQueryString(location.search);
    var errors = [];
    var startTime;

    var main = function() {
        if ( parameters.elapsed ) {
            startTime = new Date().getTime();
        } else {
            elapsed = function() {};
        }
        elapsed("start");
        /* May be included in next version
        yepnope({
            test: parameters.debug,
            yep: ['js/wv.debug.js'],
            complete: loadConfig
        });
        */
        loadConfig();
    };

    var loadConfig = function() {
        elapsed("loading config");
        var configURI = wv.brand.url("config/wv.json");
        var promise = $.getJSON(configURI);
        promise
            .done(wv.util.wrap(onConfigLoaded))
            .fail(wv.util.error);
        wv.ui.indicator.delayed(promise, 1000);
    };

    var onConfigLoaded = function(data) {
        elapsed("config loaded");
        config = data;
        config.parameters = parameters;

        // Export for debugging
        wvx.config = config;

        wv.debug.config(config);

        // Load any additional scripts as needed
        if ( config.scripts ) {
            _.each(config.scripts, function(script) {
                $.getScript(script);
            });
        }

        wv.layers.validate(errors, config);

        parsers = [
            wv.proj.parse,
            wv.layers.parse,
            wv.date.parse,
            wv.map.parse,
            wv.palettes.parse
        ];
        if ( config.features.dataDownload ) {
            parsers.push(wv.data.parse);
        }

        _.each(parsers, function(parser) {
            parser(state, errors, config);
        });
        requirements = [
            wv.palettes.requirements(state, config)
        ];

        $.when.apply(null, requirements)
            .then(wv.util.wrap(init))
            .fail(wv.util.error);
    };

    var init = function() {
        elapsed("init");
        // If at the beginning of the day, wait on the previous day until GIBS
        // catches up (about three hours)
        var initialDate;
        if ( config.defaults.startDate ) {
            initialDate = wv.util.parseDateUTC(config.defaults.startDate);
        } else {
            initialDate = wv.util.now();
            if ( initialDate.getUTCHours() < 3 ) {
                initialDate.setUTCDate(initialDate.getUTCDate() - 1);
            }
        }

        // Models
        var models = {
            wv: {
                events: wv.util.events()
            }
        };

        models.proj     = wv.proj.model(config);
        models.palettes = wv.palettes.model(models, config);
        models.layers   = wv.layers.model(models, config);
        models.date     = wv.date.model({ initial: initialDate });
        if ( config.features.dataDownload ) {
            models.data = wv.data.model(models, config);
        }
        models.map      = wv.map.model(models, config);
        models.link     = wv.link.model(config);

        // Export for debugging
        wvx.models = models;

        var updateDateRange = function() {
            models.date.range(models.layers.dateRange());
        };
        models.layers.events
                .on("add", updateDateRange)
                .on("remove", updateDateRange)
                .on("update", updateDateRange);
        updateDateRange();

        models.link
            .register(models.proj)
            .register(models.layers)
            .register(models.date)
            .register(models.palettes)
            .register(models.map);
        if ( config.features.dataDownload) {
            models.link.register(models.data);
        }
        models.link.load(state);
        if ( config.features.arcticProjectionChange ) {
            models.proj.change = wv.proj.change(models, config);
        }

        elapsed("ui");
        // Create widgets
        var ui = {};

        ui.map = wv.map.ui(models, config);
        ui.anim = wv.date.anim(models.date, ui.map, {
            debug: parameters.debug === "anim"
        });
        ui.proj = wv.proj.ui(models, config);
        ui.sidebar = wv.layers.sidebar(models, config);
        ui.activeLayers = wv.layers.active(models, ui, config);
        ui.addLayers = wv.layers.add(models, ui, config);
        ui.timeline = wv.date.timeline(models, config, ui);
        ui.dateLabel = wv.date.label(models);
        ui.dateWheels = wv.date.wheels(models, config);
        ui.rubberband = wv.image.rubberband(models, ui, config);
        ui.image = wv.image.panel(models, ui, config);
        if ( config.features.dataDownload ) {
            ui.data = wv.data.ui(models, ui, config);
            // FIXME: Why is this here?
            ui.data.render();
        }
        ui.link = wv.link.ui(models, config);
        ui.tour = wv.tour(models, ui, config);
        ui.info = wv.ui.info(ui, config);

        // Export for debugging
        wvx.ui = ui;

        $(window).resize(function() {
          if ($(window).width() < 720) {
            $('#productsHoldertabs li.first a').trigger('click');
          }
        });

        document.activeElement.blur();
        $("input").blur();
        $("#eventsHolder").hide();

        // Wirings
        if ( config.features.dataDownload ) {
            models.data.events
                .on("activate", function() {
                    ui.sidebar.selectTab("download");
                })
                .on("queryResults", function() {
                    ui.data.onViewChange(ui.map.selected);
                });
            ui.map.events
                .on("moveEnd", function(map) {
                    ui.data.onViewChange(map);
                })
                .on("zoomEnd", function(map) {
                    ui.data.onViewChange(map);
                });
                // FIXME: This is a hack
                models.map.events.on("projection", models.data.updateProjection);
        }

        // Sink all focus on inputs if click unhandled
        $(document).click(function(event) {
            if ( event.target.nodeName !== "INPUT" ) {
                $("input").blur();
            }
        });

        // Console notifications
        if ( wv.brand.release() ) {
            console.info(wv.brand.NAME + " - Version " + wv.brand.VERSION +
                " - " + wv.brand.BUILD_TIMESTAMP);
        } else {
            console.warn("Development version");
        }
        wv.debug.layers(ui, models, config);

        errorReport();
        //wv.debug.error(parameters);

        models.wv.events.trigger("startup");
        elapsed("done");
    };

    var errorReport = function() {
        var layersRemoved = 0;

        _.each(errors, function(error) {
            var cause = ( error.cause ) ? ": " + error.cause : "";
            wv.util.warn(error.message + cause);
            if ( error.layerRemoved  ) {
                layersRemoved = layersRemoved + 1;
            }
        });

        if ( layersRemoved > 0 ) {
            wv.ui.notify(
                "Incomplete configuration<br><br>" +
                layersRemoved + " layer(s) were removed<br><br>" +
                "Contact us at " +
                "<a href='mailto:@MAIL@'>" +
                "@MAIL@</a>");
        }
    };

    var elapsed = function(message) {
        var t = new Date().getTime() - startTime;
        console.log(t, message);
    };

    /*
    var debuggingFeatures = function(config) {
        // Install a black palette which can be used to find "holes" in
        // LUT mappings.
        if ( config.parameters.debugPalette ) {
            var debugPalette = Worldview.Palette.Palette({
                id: "__DEBUG",
                name: "Debug",
                stops: [{at: 0, r: 0, g: 0, b: 0, a: 0}]
            });
            config.palettes["__DEBUG"] = debugPalette;
            config.paletteOrder.unshift("__DEBUG");
        }

        // Test error dialog
        if ( config.parameters.showError ) {
            *** SHOW ERROR
        }
    };
    */

    wv.util.wrap(main)();

});
