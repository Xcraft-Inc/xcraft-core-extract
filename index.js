'use strict';

var moduleName = 'extract';

var fs   = require ('fs');
var tar  = require ('tar-fs');

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

var untar = function (src, dest, filter, inflate, callback, callbackProgress) {
  var progress = progressStreams (src, callbackProgress);

  fs.createReadStream (src)
    .on ('error', callback)
    .pipe (progress.before)
    .pipe (inflate (callback))
    .pipe (progress.after)
    .pipe (tar.extract (dest, {
      ignore: name => {
        return filter && filter.test (name);
      }
    }))
    .on ('finish', callback);
};

exports.targz = function (src, dest, filter, callback, callbackProgress) {
  var zlib = require ('zlib');

  untar (src, dest, filter, function (callback) {
    return zlib
      .Unzip ()
      .on ('error', callback);
  }, callback, callbackProgress);
};

exports.tarbz2 = function (src, dest, filter, callback, callbackProgress) {
  var bz2 = require ('unbzip2-stream');

  untar (src, dest, filter, function (callback) {
    return bz2 ()
      .on ('error', callback);
  }, callback, callbackProgress);
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
exports.bz2 = exports.tarbz2;
