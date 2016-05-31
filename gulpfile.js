var gulp = require('gulp'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    connect = require('gulp-connect'),
    boot = require('loopback-boot'),
    fs = require('fs'),
    electron = require('electron-connect').server.create();

var appDir = __dirname + "/www/app";
var pubDir = __dirname + "/www/public";

gulp.task('browserify', function () {
    var b, out;
    b = browserify({
        basedir: appDir,
        cache: {},
        packageCache: {}
    });

    b.add(appDir + '/Index.jsx');

    out = fs.createWriteStream(pubDir + "/bundle.js");
    b.transform(babelify).bundle().pipe(out).on('finish', connect.reload);
});

gulp.task('electron', function () {
    electron.restart();
});

gulp.task('connect', function () {
    connect.server({
        root: 'www/public',
        livereload: true
    });
    electron.start();
});

gulp.task('js', function () {
    gulp.src('./www/**/*.js')
        .pipe(connect.reload());
});

gulp.task('html', function () {
    gulp.src('./www/**/*.html')
        .pipe(connect.reload());
});

gulp.task('watch', function () {
    gulp.watch(['./www/**/*.html'], ['html']);
    gulp.watch(['./www/**/*.js'], ['js']);
    gulp.watch(['./www/**/*.jsx', './node_modules/rs-*/lib/**/**/*.js'], ['browserify']);
    gulp.watch(['main.js', './node_modules/rs-*/lib/models/*.js', './node_modules/rs-*/lib/routes/*.js', './node_modules/rs-*/lib/server/*.js', './node_modules/rs-*/lib/shared/*.js'], ['electron']);
});

gulp.task('default', ['browserify', 'connect', 'watch']);