'use strict';

let gulp = require('gulp'),
	boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);

boilerplate({
	transpileOut: 'build'
});
