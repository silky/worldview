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

buster.testCase("wv.util", function() {

    var self = {};

    self["fromQueryString: Empty object when there is no query string"] = function() {
        buster.assert.equals(wv.util.fromQueryString(""), {});
    };

    self["fromQueryString: Values are parsed correctly"] = function() {
        var x = wv.util.fromQueryString("?foo=a&bar=b");
        buster.assert.equals("a", x.foo);
        buster.assert.equals("b", x.bar);
    };

    self["fromQueryString: Does not need a leading ?"] = function() {
        var x = wv.util.fromQueryString("foo=a&bar=b");
        buster.assert.equals("a", x.foo);
        buster.assert.equals("b", x.bar);
    };

    self["fromQueryString: Escaped values are converted"] = function() {
        var x = wv.util.fromQueryString("foo=image%2fjpeg");
        buster.assert.equals("image/jpeg", x.foo);
    };

    self["toQueryString: Empty string with no values"] = function() {
        buster.assert.equals(wv.util.toQueryString({}), "");
    };

    self["toQueryString: Converts object to string"] = function() {
        var qs = wv.util.toQueryString({foo: "a", bar: "b"});
        buster.assert.equals(qs, "?foo=a&bar=b");
    };

    self["toQueryString: Encodes value"] = function() {
        var qs = wv.util.toQueryString({format: "image/png"});
        buster.assert.equals(qs, "?format=image%2Fpng");
    };

    self["toQueryString: Exception not encoded"] = function() {
        var qs = wv.util.toQueryString({format: "image/png"}, ["%2f"]);
        buster.assert.equals(qs, "?format=image/png");
    };

    self["toQueryString: Multiple exceptions not encoded"] = function() {
        var qs = wv.util.toQueryString({format: "/image/png/"}, ["%2f"]);
        buster.assert.equals(qs, "?format=/image/png/");
    };

    self["parseTimestampUTC: Parses valid timestamp"] = function() {
        var answer = new Date(Date.UTC(2013, 02, 15, 11, 22, 33));
        var result = wv.util.parseTimestampUTC("2013-03-15T11:22:33Z");
        buster.assert.equals(result.getTime(), answer.getTime());
    };

    self["parseTimestampUTC: Parses valid timestamp without Z"] = function() {
        var answer = new Date(Date.UTC(2013, 02, 15, 11, 22, 33));
        var result = wv.util.parseTimestampUTC("2013-03-15T11:22:33");
        buster.assert.equals(result.getTime(), answer.getTime());
    };

    self["parseDateUTC: Parses valid date"] = function() {
        var answer = new Date(Date.UTC(2013, 02, 15));
        var result = wv.util.parseDateUTC("2013-03-15");
        buster.assert.equals(result.getTime(), answer.getTime());
    };

    self["parseDateUTC: Exception on invalid date"] = function() {
        buster.assert.exception(function() {
            wv.util.parseDateUTC("x");
        });
    };

    self["toISOStringDate: Converts date"] = function() {
        var d = new Date(Date.UTC(2013, 0, 15));
        buster.assert.equals(wv.util.toISOStringDate(d), "2013-01-15");
    };

    self["toISOStringTimeHM: Converts time"] = function() {
        var d = new Date(Date.UTC(2013, 0, 15, 11, 22, 33));
        buster.assert.equals(wv.util.toISOStringTimeHM(d), "11:22");
    };

    self["toCompactTimestamp: Converts timestamp"] = function() {
        var d = new Date(Date.UTC(2013, 0, 15, 11, 22, 33, 444));
        buster.assert.equals(wv.util.toCompactTimestamp(d),
            "20130115112233444");
    };

    self["fromCompactTimestamp: Parses timestamp"] = function() {
        var answer = new Date(Date.UTC(2013, 0, 15, 11, 22, 33, 444));
        var result = wv.util.fromCompactTimestamp("20130115112233444");
        buster.assert.equals(answer.getTime(), result.getTime());
    };

    self["fromCompactTimestamp: Throws exception when invalid"] = function() {
        var answer = new Date(Date.UTC(2013, 0, 15, 11, 22, 33, 444));
        buster.assert.exception(function() {
            wv.util.fromCompactTimestamp("x0130115112233444");
        });
    };

    self["clearTimeUTC: Time set to UTC midnight"] = function() {
        var d = new Date(2013, 02, 15, 12, 34, 56, 789);
        wv.util.clearTimeUTC(d);
        buster.assert.equals(2013, d.getUTCFullYear());
        buster.assert.equals(2, d.getUTCMonth());
        buster.assert.equals(15, d.getUTCDate());
        buster.assert.equals(0, d.getUTCHours());
        buster.assert.equals(0, d.getUTCMinutes());
        buster.assert.equals(0, d.getUTCSeconds());
    };

    self["ajaxCache: Non-cached request returned"] = function(done) {
        this.stub(jQuery, "ajax").returns(jQuery.Deferred().resolve("answer"));
        var cache = wv.util.ajaxCache();
        var promise = cache.submit({
            url: "url",
            data: "foo=bar"
        }).done(function(data) {
            buster.assert.equals(data, "answer");
            done();
        });
    };

    self["wrap: Correclty invokes function"] = function() {
        var func = this.stub().returns("answer");
        var wrap = wv.util.wrap(func);
        var answer = wrap(1, 2);
        buster.assert.equals(answer, "answer");
        buster.assert.calledWith(func, 1, 2);
    };

    self["wrap: Invokes error handler on exception"] = function() {
        var func = this.stub().throws();
        this.stub(wv.util, "error");
        var wrap = wv.util.wrap(func);
        wrap();
        buster.assert.called(wv.util.error);
    };

    self["dateAdd: Adds days"] = function() {
        var d = new Date(2011, 01, 01);
        var result = wv.util.dateAdd(d, "day", 4);
        buster.assert.equals(result.getDate(), 5);
    };

    self["dateAdd: Adds months"] = function() {
        var d = new Date(2011, 01, 01);
        var result = wv.util.dateAdd(d, "month", 4);
        buster.assert.equals(result.getMonth(), 5);
    };

    self["dateAdd: Adds years"] = function() {
        var d = new Date(2011, 01, 01);
        var result = wv.util.dateAdd(d, "year", 4);
        buster.assert.equals(result.getFullYear(), 2015);
    };

    self["dateAdd: Throws error on invalid interval"] = function() {
        var d = new Date(2011, 01, 01);
        buster.assert.exception(function() {
            wv.util.dateAdd(d, "foo", 5);
        });
    };

    return self;

}());
