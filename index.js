const PLUGIN_NAME   = 'gulp-copycat';

var gutil           = require('gulp-util');
var events          = require('event-stream');
var _               = require('lodash');

var PluginError     = gutil.PluginError;

var defaultOptions  = {
  tags: {
    source: [
      {
        begin: /<!--\s*ccs:\s*(\S+)\s*-->/gi,
        end:   /<!--\s*\/ccs:\s*(\S+)\s*-->/gi
      }
    ],
    dest: [
      {
        begin: /<!--\s*ccd:\s*(\S+)\s*-->/gi,
        end:   /<!--\s*\/ccd:\s*(\S+)\s*-->/gi
      }
    ]
  },

  // Keep tags when replacing
  keepSourceTags:     false,
  keepSourceValues:   false,
  keepDestTags:       false,

  // Filter out files containing source tags in pipe stream
  filterSourceFiles:  true
};

var _copycat = {
  tags: {
    source:     [],
    sourceMap:  {},
    dest:       [],
    files:      {
      source: {},
      dest:   {}
    }
  },
  options:      {}
};

function copycat(options) {

  if (options && !_.isObject(options)) {
    throw new PluginError(PLUGIN_NAME, 'options parameter has to be an object');
  }

  _copycat.options = _.merge({}, defaultOptions, options);

  var files = [];
  var _this = null;

  return events.through(
      function (file) {
        _this = _this || this;
        files.push(file);
      },
      function () {
        if (_this) {

          files.forEach(function (file) {
            extract(file);
          });

          files.forEach(function (file) {
            write(file, function () {
              if (_copycat.options.filterSourceFiles) {
                if (_copycat.tags.files.source[file.path] && !_copycat.tags.files.dest[file.path]) return;
              }
              _this.emit('data', file);
            });
          });
        }

        this.emit('end');
      }
  );
}

function removeSourceTags(file) {

  if (_copycat.options.keepSourceTags) return;
  var contents = String(file.contents);

  _.forEach(_copycat.options.tags.source, function (tag) {

    if (!_copycat.options.keepSourceValues) {
      var regex = tag.combination ? tag.combination : combineRegex(tag.begin, tag.end);
      contents = contents.replace(regex, '');
    }
    else {
      contents = contents.replace(tag.begin, '');
      contents = contents.replace(tag.end, '');
    }

  });

  file.contents = new Buffer(contents);
}

function combineRegex(regexOne, regexTwo) {

  var r1 = regexOne.toString();
  var r2 = regexTwo.toString();

  var cleanRegex = new RegExp(/\/(.*)\/.*/);

  regexOne = cleanRegex.exec(r1);
  regexTwo = cleanRegex.exec(r2);

  return regexOne && regexOne.length > 1 && regexTwo && regexTwo.length > 1 ?
      new RegExp(
          regexOne[1].replace('(', '').replace(')', '') + '(.*)' +
          regexTwo[1].replace('(', '').replace(')', ''), 'gi'
      ): null;
}

// Plugin level function(dealing with files)
function extract(file) {
  if (file.isNull() || file.isStream())    return callback(null, file);
  if (file.isBuffer()) {

    var source  = getTags(file, _copycat.options.tags.source);
    var dest    = getTags(file, _copycat.options.tags.dest);

    if (source && source.tags && source.tags.length) {

      // Append tag to source tags array
      _copycat.tags.source = _copycat.tags.source.concat(source.tags);

      _.forEach(source.tags, function (tag) {

        // Add tag to map
        _copycat.tags.sourceMap[tag.name] = tag.value;
      });

      // Add file path to map of files with source tags
      _copycat.tags.files.source[file.path] = true;
    }

    // Append tag to dest tags array
    if (dest && dest.tags && dest.tags.length) {
      _copycat.tags.dest = _copycat.tags.dest.concat(dest);

      // Add file path to map of files with dest tags
      _copycat.tags.files.dest[file.path] = true;
    }
  }
}

function write(file, callback) {
  var filepath = file.path;

  var filechange  = _.find(_copycat.tags.dest, function (tag) {
    return tag.filepath === filepath;
  });

  if (!filechange || file.isNull() || file.isStream()) return callback(null, file);

  if (file.isBuffer()) {

    _.forEach(filechange.tags, function (tag) {
      var replacement   = get(tag.name);
      var indexStart    = _copycat.options.keepDestTags ? tag._copycat.begin.indexStop : tag._copycat.begin.indexStart;
      var indexStop     = _copycat.options.keepDestTags ? tag._copycat.end.indexStart  : tag._copycat.end.indexStop;

      var modifiedText  = replace(replacement, String(file.contents), indexStart, indexStop);

      file.contents = new Buffer(modifiedText);
    });

    // Remove source tags
    removeSourceTags(file);

    callback();
  }
}

function tagsObject(tags, contents, file, filepath) {
  return { tags: tags, contents: contents, file: file, filepath: filepath};
}

function getTags(file, tagPatterns) {
  if (!file || !tagPatterns) return null;

  // Convert bytes to string
  var contents  = String(file.contents);
  var matches   = [];

  _.forEach(tagPatterns, function (tag) {

    function _getTag(beginExec, endExec) {

      var data = {
        name:         null,
        value:        null,
        _copycat: {
          begin: {
            exec:       null,
            key:        null,
            value:      null,
            indexStart: null,
            indexStop:  null
          },
          end: {
            exec:       null,
            key:        null,
            value:      null,
            indexStart: null,
            indexStop:  null
          }
        }
      };

      // ------------------------------------------
      // BEGIN TAG

      // exec
      data._copycat.begin.exec        = beginExec || tag.begin.exec(contents);

      // validation
      if (!data._copycat.begin.exec) return null;

      // key
      data._copycat.begin.key         = data._copycat.begin.exec[1];

      // index start
      data._copycat.begin.indexStart  =  data._copycat.begin.exec.index;

      // index stop
      data._copycat.begin.indexStop   = data._copycat.begin.indexStart + data._copycat.begin.exec[0].length;

      // ------------------------------------------
      // END TAG

      // exec
      data._copycat.end.exec          = endExec || tag.end.exec(contents);

      // validation
      if (!data._copycat.end.exec)    return null;

      // key
      data._copycat.end.key           = data._copycat.end.exec[1];

      // index start
      data._copycat.end.indexStart    =  data._copycat.end.exec.index;

      // index stop
      data._copycat.end.indexStop     = data._copycat.end.indexStart + data._copycat.end.exec[0].length;

      // ------------------------------------------

      // Return if begin and end keys don't match
      if (data._copycat.begin.key !== data._copycat.end.key) return null;

      // Set name and value for specific tag in file
      data.name   = data._copycat.begin.key;
      data.value  = contents.substring(data._copycat.begin.indexStop, data._copycat.end.indexStart);

      matches.push(data);

      var nextBeginExec = tag.begin.exec(contents);
      var nextEndExec   = tag.end.exec(contents);

      // Continue while regex matches are defined
      if (nextBeginExec !== null && nextEndExec !== null) _getTag(nextBeginExec, nextEndExec);
    }

    _getTag(tag.begin.exec(contents), tag.end.exec(contents));

  });

  var tags = _.chain(matches)
      .filter(function (tag) { return tag !== null; })
      .sortBy(function (tag) { return tag._copycat.begin.indexStart })
      .reverse()
      .value();

  return tagsObject(tags, contents, file, file.path);
}

// Replace filecontent with value by indexes
function replace(value, filecontent, indexStart, indexEnd) {
  return filecontent.substring(0, indexStart) + value + filecontent.substring(indexEnd, filecontent.length);
}

// Get value by name
function get(name) {
  return _copycat.tags.sourceMap[name];
}

// Exporting the plugin main function
module.exports = copycat;
