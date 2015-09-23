# gulp-copycat

> Copy values inside source tag blocks to destination tag blocks
 

### Table of Contents

- [Usage](#usage)
- [API](#api)
- [Examples](#examples)
- [Change log](#changelog)



## Usage
Install:
```shell
npm install --save-dev gulp-copycat
```

Add some source tags in your source file:
```html
<!-- ccs:<name> -->
Everything here will be copied
<!-- /ccs:<name> -->
```
Add some destination blocks in your destination file:
```html
<!-- ccd:<name> -->
Everything here will be replaced by value in source file
<!-- /ccd:<name> -->
```
`name` name of the tag. 

 `ccs:` ("<u>c</u>opy <u>c</u>at <u>s</u>ource") is a predefined source tag. 
 `/ccs:` end of source tag block 

 `ccd:` ("<u>c</u>opy <u>c</u>at <u>d</u>estination") is a predefined destination tag. 
 `/ccd:` end of destination tag block 

## API
### copycat(options)
#### options
Type: `object`

- {Boolean} **filterSourceFiles** (true) - Filter out files containing source tags from pipe stream. 
	*Set to false if you want to keep both source tag files and destination tag files in pipe stream.*
	
- {Boolean} **keepSourceTags** (false) - Keep source tags in source file
	--  (`<!-- ccs:<name> -->` and `<!-- /ccs:<name> -->`)
	
	*"options.filterSourceFiles" must be set to false*
	
- {Boolean} **keepSourceTagValues** (false) - Keep  value between source tags in source file
	--   (`<!-- ccs:<name> -->` VALUES `<!-- /ccs:<name> -->`)

	*"options.filterSourceFiles" must be set to false*
	
- {Boolean} **keepDestTags** (false) - Keep destination tags in destination file
	--   (`<!-- ccd:<name> -->``<!-- /ccd:<name> -->`)


It is possible to add custom source- and destination tags. This can be useful for when you need to add tags to files that has different comment syntax than HTML:

#### options.tags
Type: `object`
```javascript
var options = {
 tags: {
    source: [
    {
		begin: /regex-here/, // beginning of source tag: <!-- ccs:name -->
		end: /regex-here/	 // end of source tag: <!-- /ccs:name -->
	}
	],
	dest: [
	{
		begin: /regex-here/, // beginning of destination tag: <!-- ccd:name -->
		end: /regex-here/	 // end of destination tag: <!-- /ccd:name -->
	}
	],
 }
};

```

## Examples

#### Example 1: Add values from one html file to another
source.html:

```html
<!DOCTYPE html>
<html>
    <head>...</head>
    <body>

<div>
    <!-- ccs: foo -->Foo<!-- /ccs: foo -->
    <!-- ccs: bar -->Bar<!-- /ccs: bar -->
</div>

```

destination.html:

```html
<!DOCTYPE html>
<html>
    <head>...</head>
    <body>

<div>
    <span>
        Have some <!-- ccd: foo -->(watch me disappear)<!-- /ccd: foo -->
    </span>

    <h3>
        with <!-- ccd:bar--><!-- /ccd:bar-->
    </h3>
</div>

```

gulpfile.js:

```javascript
var gulp 		= require('gulp');
var copycat 	= require('gulp-copycat');
var concat      = require('gulp-concat');

gulp.task('default', function() {
	return gulp.src(['source.html', 'destination.html'])
			.pipe(copycat())
			.pipe(concat('result.html'))
			.pipe(gulp.dest('/build/'))
});
```

Result (/build/result.html):

```html
<!DOCTYPE html>
<html>
    <head>...</head>
    <body>

<div>
    <span>
        Have some Foo
    </span>

    <h3>
        with Bar
    </h3>
    <h1></h1>
</div>
```
#### Example 2: Add source tags for javascript comment syntax: 

constants.js
```javascript
var version = /*-- ccs:version --*/1.2.3/*-- /ccs:version --*/;
```

destination.html:
```html
<!DOCTYPE html>
<html>
    <head>
	    <title><!-- ccd:version --><!-- /ccd:version --></title>
    </head>
    <body>...

```

gulpfile.js:

```javascript
var gulp 		= require('gulp');
var copycat 	= require('gulp-copycat');
var concat      = require('gulp-concat');

var sourceRegexBegin: /\/\*--\s*ccs:\s*(\S+)\s*--\*\//gi
var sourceRegexEnd:   /\/\*--\s*\/ccs:\s*(\S+)\s*--\*\//gi

var options = {
 tags: {
    source: [
    {
		begin: sourceRegexBegin, // beginning of source tag: /*-- ccs:name --*/
		end:   sourceRegexEnd	 // end of source tag: /*-- /ccs:name --*/
	}
	]
 }

gulp.task('default', function() {
	return gulp.src(['constants.js', 'destination.html'])
			.pipe(copycat(options))
			.pipe(concat('index.html'))
			.pipe(gulp.dest('/build/'))
});
```
Result (/build/index.html):
```html
<!DOCTYPE html>
<html>
    <head>
	    <title>1.2.3</title>
    </head>
    <body>...

```

## Changelog

### 0.0.3
> Add README

### 0.0.2
> Initial version added to GitHub


