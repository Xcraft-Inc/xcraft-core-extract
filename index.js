'use strict';

var moduleName = 'extract';

var fs   = require ('fs');
var path = require ('path');

var xFs  = require ('xcraft-core-fs');
var xLog = require ('xcraft-core-log') (moduleName);


var progressStreams = function (file, callback) {
  var readPercent = 0;
  var fileSize    = fs.statSync (file).size;

  var streamBefore = require ('progress-stream') ({length: fileSize});
  streamBefore.on ('progress', function (progress) {
    readPercent = progress.percentage;
  });

  var streamAfter = require ('progress-stream') ();
  streamAfter.on ('progress', function (progress) {
    var total = progress.transferred * 100.0 / readPercent;
    streamAfter.setLength (total);

    if (callback) {
      callback (progress.transferred, progress.length);
    }
  });

  return {
    before: streamBefore,
    after:  streamAfter
  };
};

exports.targz = function (src, dest, filter, callback, callbackProgress) {
  var tar  = require ('tar');
  var zlib = require ('zlib');

  var promises = [];
  var progress = progressStreams (src, callbackProgress);

  fs.createReadStream (src)
    .on ('error', callback)
    .pipe (progress.before)
    .pipe (zlib
            .Unzip ()
            .on ('error', callback))
    .pipe (progress.after)
    .pipe (tar.Parse ())
    .on ('entry', function (entry) {
      if (filter && filter.test (entry.path)) {
        return;
      }

      var fullpath = path.join (dest, entry.path);
      xFs.mkdir (path.dirname (fullpath));

      if (entry.type === 'File') {
        promises.push (new Promise (function (resolve, reject) {
          var writeStream = fs.createWriteStream (fullpath, {mode: entry.props.mode});
          entry
            .pipe (writeStream)
            .on ('error', function (err) {
              reject (err);
            })
            .on ('finish', function () {
              resolve ();
            });
        }));
      }
    })
    .on ('end', function () {
      Promise.all (promises).then (function () {
        callback ();
      });
    });
};

exports.zip = function (src, dest, filter, callback) {
  var DecompressZip = require ('decompress-zip');

  new DecompressZip (src)
    .on ('error', callback)
    .on ('extract', function (log) { /* jshint ignore:line */
      callback ();
    })
    .extract ({
      path: dest,
      filter: function (entry) {
        return filter ? filter.test (entry.path) : true;
      }
    });
};

/**
 * Extract 7zip archives.
 * TODO: add Unix support.
 */
exports['7z'] = function (src, dest, filter, callback) {
  var xProcess = require ('xcraft-core-process') ();

  var args = ['x', '-y', '-o' + dest, src];
  xLog.verb ('7za.exe ' + args.join (' '));
  xProcess.spawn ('7za.exe', args, {}, callback);
};

exports.tgz = exports.targz;
exports.gz  = exports.targz;
