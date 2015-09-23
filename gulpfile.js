var gulp 		= require('gulp');
var copycat = require('./index.js');

var sourceFolder = './test/src/';
var buildFolder  = './test/build/';

gulp.task('copycat', function () {

  return gulp.src(sourceFolder + '*.html')
      .pipe(copycat({ filterSourceFiles: false }))
      .pipe(gulp.dest(buildFolder));
});

gulp.task('default', ['copycat']);
