'use strict';

var fs = require('fs');
var tar = require('tar-fs');

var progressStreams = function (file, callback) {
  var readPercent = 0;
  var fileSize = fs.statSync(file).size;

  var streamBefore = require('progress-stream')({length: fileSize});
  streamBefore.on('progress', function (progress) {
    readPercent = progress.percentage;
  });

  var streamAfter = require('progress-stream')();
  streamAfter.on('progress', function (progress) {
    var total = (progress.transferred * 100.0) / readPercent;
    streamAfter.setLength(total);

    if (callback) {
      callback(progress.transferred, progress.length);
    }
  });

  return {
    before: streamBefore,
    after: streamAfter,
  };
};

var untar = function (src, dest, filter, inflate, callback, callbackProgress) {
  var progress = progressStreams(src, callbackProgress);

  fs.createReadStream(src)
    .on('error', callback)
    .pipe(progress.before)
    .pipe(inflate(callback))
    .pipe(progress.after)
    .pipe(
      tar.extract(dest, {
        utimes: true,
        ignore: (name) => filter && filter.test(name),
      })
    )
    .on('finish', callback);
};

exports.targz = function (src, dest, filter, resp, callback, callbackProgress) {
  var zlib = require('zlib');

  untar(
    src,
    dest,
    filter,
    (callback) => zlib.Unzip().on('error', callback),
    callback,
    callbackProgress
  );
};

exports.tarbz2 = function (
  src,
  dest,
  filter,
  resp,
  callback,
  callbackProgress
) {
  var bz2 = require('unbzip2-stream');

  untar(
    src,
    dest,
    filter,
    (callback) => bz2().on('error', callback),
    callback,
    callbackProgress
  );
};

exports.tarxz = function (src, dest, filter, resp, callback, callbackProgress) {
  const xz = require('xz-pipe');

  untar(
    src,
    dest,
    filter,
    (callback) => xz.d().on('error', callback),
    callback,
    callbackProgress
  );
};

exports.zip = function (src, dest, filter, resp, callback) {
  const extract = require('extract-zip');

  (async function () {
    try {
      await extract(src, {dir: dest});
      callback();
    } catch (err) {
      callback(err);
    }
  })();
};

/**
 * Extract 7zip archives.
 * TODO: add Unix support.
 */
exports['7z'] = function (src, dest, filter, resp, callback) {
  var xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  var args = ['x', '-y', '-o' + dest, src];
  resp.log.verb('7za.exe ' + args.join(' '));
  xProcess.spawn('7za.exe', args, {}, callback);
};

exports.tgz = exports.targz;
exports.gz = exports.targz;
exports.bz2 = exports.tarbz2;
exports.xz = exports.tarxz;
