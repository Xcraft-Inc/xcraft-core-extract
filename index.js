'use strict';

var tar   = require ('tar');
var zlib  = require ('zlib');
var zogFs = require ('xcraft-core-fs');

exports.targz = function (src, dest, filter, callbackDone) {
  var fs   = require ('fs');
  var path = require ('path');

  fs.createReadStream (src)
    .on ('error', function (error) {
      console.error (error);
      callbackDone (false);
    })
    .pipe (zlib.Unzip ())
    .pipe (tar.Parse ())
    .on ('entry', function (entry) {
      if (filter && filter.test (entry.path)) {
        return;
      }

      var fullpath = path.join (dest, entry.path);
      zogFs.mkdir (path.dirname (fullpath));
      entry.pipe (fs.createWriteStream (fullpath));
    })
    .on ('end', function () {
      callbackDone (true);
    });
};
