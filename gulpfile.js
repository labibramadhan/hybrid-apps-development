var gulp = require('gulp'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    uglifyify = require('uglifyify'),
    babel = require('gulp-babel'),
    glob = require('glob'),
    del = require('del'),
    util = require('gulp-util'),
    connect = require('gulp-connect'),
    boot = require('loopback-boot'),
    fs = require('fs'),
    electron = require('electron-connect').server.create();

var appDir = __dirname + "/app";
var pubDir = __dirname + "/www";

gulp.task('babel', function (cb) {
    var promises = [];
    glob.sync('node_modules/rs-*').forEach(function (filePath) {
        if (fs.statSync(filePath).isDirectory()) {
            promises.push(new Promise(function (resolve, reject) {
                var dest, pipeline;
                dest = filePath.concat('/lib');
                del([dest]).then(function () {
                    pipeline = gulp.src(filePath.concat('/src/**/*.js'))
                        .pipe(babel({presets: ['es2015', 'react']}))
                        .pipe(gulp.dest(dest));
                    pipeline.on('end', function () {
                        resolve();
                    });
                });
            }));
        }
    });
    Promise.all(promises).then(function () {
        cb();
    });
});

gulp.task('browserify', ['babel'], function (cb) {
    fs.readFile('.rsrc', 'utf8', function (err, config) {
        config = JSON.parse(config);
        if (err) throw err;

        process.env.NODE_ENV = config.env;

        var b, out;
        b = browserify({
            basedir: appDir,
            cache: {},
            packageCache: {}
        });

        b.add(appDir + '/Index.jsx');

        out = fs.createWriteStream(pubDir + "/bundle.js");
        b.transform(babelify);
        if (config.env == 'production') {
            b.transform({
                global: true
            }, 'uglifyify');
        }
        b.bundle().pipe(out).on('finish', function () {
            cb();
        });
    });
});

gulp.task('connect', ['browserify'], function () {
    connect.server({
        root: pubDir,
        livereload: true
    });
    electron.start();
});

gulp.task('livereload', ['browserify'], function () {
    gulp.src(['./www/**/*.js', './www/**/*.html'])
        .pipe(connect.reload());
});

gulp.task('electron', ['browserify'], function () {
    electron.restart();
});

gulp.task('watch', ['browserify'], function () {
    gulp.watch(['./www/**/*.html'], ['livereload']);
    gulp.watch(['./node_modules/rs-*/src/**/*.js', '!./node_modules/rs-*/src/models/*.js', '!./node_modules/rs-*/src/routes/server/*.js', '!./node_modules/rs-*/src/server/*.js', '!./node_modules/rs-*/src/shared/*.js'], ['babel', 'browserify', 'livereload']);
    gulp.watch(['./www/**/*.jsx'], ['browserify', 'livereload']);
    gulp.watch(['main.js', './node_modules/rs-*/src/models/*.js', './node_modules/rs-*/src/routes/server/*.js', './node_modules/rs-*/src/server/*.js', './node_modules/rs-*/src/shared/*.js', './node_modules/rs-*/src/**/server.js'], ['babel', 'browserify', 'livereload', 'electron']);
});

gulp.task('default', ['babel', 'browserify', 'connect', 'watch']);