var gulp = require('gulp'),
    webpack = require('webpack'),
    webpackDevServer = require('webpack-dev-server'),
    babel = require('gulp-babel'),
    glob = require('glob'),
    del = require('del'),
    util = require('gulp-util'),
    connect = require('gulp-connect'),
    boot = require('loopback-boot'),
    fs = require('fs'),
    electron = require("electron-prebuilt"),
    proc = require("child_process");

var appDir = __dirname + "/app";
var pubDir = __dirname + "/www";
let electronChild;

const config = JSON.parse(fs.readFileSync('.rsrc', 'utf8'));

let compiler = webpack({
    entry: {
        main: [
            'webpack-dev-server/client?http://0.0.0.0:1235', // WebpackDevServer host and port
            'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors
            './app/Index.jsx'
        ]
    },
    output: {
        path: pubDir,
        filename: 'bundle.js',
        publicPath: '/'
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ],
    module: {
        loaders: [
            {
                test: /(rs\-.*\.js$)|(\.jsx?$)/,
                exclude: /(node_modules|bower_components)/,
                loaders: ['react-hot', 'babel']
            }
        ]
    }
});

gulp.task('babel', function (cb) {
    var promises = [];
    glob.sync('node_modules/rs-*').forEach(function (filePath) {
        if (fs.statSync(filePath).isDirectory()) {
            promises.push(new Promise(function (resolve, reject) {
                var dest, pipeline;
                dest = filePath.concat('/lib');
                pipeline = gulp.src(filePath.concat('/src/**/*.js'))
                    .pipe(babel({presets: ['es2015', 'react']}))
                    .pipe(gulp.dest(dest));
                pipeline.on('end', function () {
                    resolve();
                });
            }));
        }
    });
    Promise.all(promises).then(function () {
        cb();
    });
});

gulp.task('babel:electron', ['babel'], function (cb) {
    var pipeline = gulp.src('main.jsx')
        .pipe(babel())
        .pipe(gulp.dest(__dirname));
    pipeline.on('end', function () {
        cb();
    });
});

gulp.task('webpack', ['babel'], function (cb) {
    process.env.NODE_ENV = config.env;
    cb();
});

gulp.task('connect', ['webpack'], function () {
    compiler.run(function () {
    });
    let server = new webpackDevServer(compiler, {
        contentBase: "./www"
    });
    server.listen(1235);
});

gulp.task('livereload', ['webpack'], function () {
    // gulp.src(['./www/**/*.html'])
    //     .pipe(connect.reload());
});

gulp.task('electron', ['webpack'], function () {
    if (electronChild) electronChild.kill();
    electronChild = proc.spawn(electron, [__dirname.concat('/main.js')], {cwd: __dirname});
});

gulp.task('watch', ['webpack'], function () {
    gulp.watch(['./www/**/*.html'], ['livereload']);
    gulp.watch(['./app/**/*.jsx', './node_modules/rs-*/src/**/*.js', '!./node_modules/rs-*/src/models/*.js', '!./node_modules/rs-*/src/routes/server/*.js', '!./node_modules/rs-*/src/server/*.js', '!./node_modules/rs-*/src/shared/*.js'], ['babel']);
    gulp.watch(['main.jsx', './node_modules/rs-*/src/models/*.js', './node_modules/rs-*/src/routes/server/*.js', './node_modules/rs-*/src/server/*.js', './node_modules/rs-*/src/shared/*.js', './node_modules/rs-*/src/**/server.js'], ['babel', 'babel:electron', 'electron']);
});

gulp.task('default', ['babel', 'babel:electron', 'webpack', 'connect', 'electron', 'watch']);