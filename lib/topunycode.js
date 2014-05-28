"use strict";

var punycode = require("punycode");

module.exports = function(address) {
    return address.replace(/((?:https?:\/\/)?.*\@)?([^\/]*)/, function(o, start, domain) {
        return (start || "") + punycode.toASCII(domain);
    });
};