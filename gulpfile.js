var gulp = require('gulp'),
    browserify = require('browserify'),
    babelify = require('babelify'),
    connect = require('gulp-connect'),
    boot = require('loopback-boot'),
    fs = require('fs');

var appDir = __dirname + "/www/app";
var pubDir = __dirname + "/www/public";

gulp.task('browserify', function () {
    var b, out;
    b = browserify({
        basedir: appDir,
        cache:{},
        packageCache: {}
    });
    //
    // b.require(appDir + '/Loopback.jsx', {expose: 'loopback-app'});
    //
    b.add(appDir + '/Index.jsx');
    //
    // boot.compileToBrowserify(__dirname, b);
    
    out = fs.createWriteStream(pubDir + "/bundle.js");
    b.transform(babelify).bundle().pipe(out);
});

gulp.task('connect', function () {
    connect.server({
        root: 'www/public',
        livereload: true
    });
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
    gulp.watch(['./www/**/*.jsx', './node_modules/rs-*/lib/**/**/*.js', 'model-config.json', 'datasources.json', './models/*.json'], ['browserify']);
});

gulp.task('default', ['browserify', 'connect', 'watch']);