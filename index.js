'use strict';

var tar  = require ('tar');
var zlib = require ('zlib');
var when = require ('when');

var xFs = require ('xcraft-core-fs');

exports.targz = function (src, dest, filter, callbackDone) {
  var fs   = require ('fs');
  var path = require ('path');
  var promises = [];

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
      xFs.mkdir (path.dirname (fullpath));

      if (entry.type === 'File') {
        promises.push (when.promise (function (resolve, reject) {
          var writeStream = fs.createWriteStream (fullpath);
          entry.pipe (writeStream).on ('error', function (err) {
            reject (err);
          })
          .on ('finish', function () {
            resolve ();
          });
        }));
      }
    })
    .on ('end', function () {
      when.all (promises).then (function () {
        callbackDone (true);
      });
    });
};
