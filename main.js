'use strict';

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _loopback = require('loopback');

var _loopback2 = _interopRequireDefault(_loopback);

var _loopbackExplorer = require('loopback-explorer');

var _loopbackExplorer2 = _interopRequireDefault(_loopbackExplorer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lbApp = (0, _loopback2.default)();

var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;

var publicDir = __dirname + '/www/public';

var embedApp = function embedApp(params, type) {
    var mainDir = './node_modules/'.concat(params.dir);
    _fs2.default.readdir(mainDir, function (err, files) {
        files.forEach(function (file) {
            var currentItem = require(mainDir.concat("/".concat(file)));
            switch (type) {
                case 'routes':
                    currentItem(params.app);
                    break;
                case 'models':
                    if (typeof currentItem.options === 'undefined') {
                        currentItem.options = {};
                    }
                    var model = params.ds.createModel(currentItem.name, currentItem.properties, currentItem.options);
                    params.app.model(model);
                    break;
            }
        });
    });
};

var ds = _loopback2.default.createDataSource('memory');

var config = JSON.parse(_fs2.default.readFileSync('.rsrc', 'utf8'));

if (typeof config.modules !== 'undefined') {
    _underscore2.default.each(config.modules, function (cfg, module) {
        if (typeof cfg.routes !== "undefined") {
            embedApp({ app: lbApp, dir: module.concat(cfg.routes) }, 'routes');
        }
        if (typeof cfg.models !== "undefined") {
            embedApp({ app: lbApp, ds: ds, dir: module.concat(cfg.models) }, 'models');
        }
    });
}

app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    lbApp.use(config.apiEndpoint, _loopback2.default.rest());
    (0, _loopbackExplorer2.default)(lbApp, { basePath: config.apiEndpoint, mountPath: config.swaggerEndpoint });
    lbApp.use(config.swaggerEndpoint, _loopbackExplorer2.default.routes(lbApp, { basePath: config.apiEndpoint }));

    lbApp.use(_express2.default.static(publicDir));
    lbApp.listen(1995);

    var mainWindow = new BrowserWindow({ width: 800, height: 400 });
    mainWindow.loadURL('http://localhost:1234/');
    mainWindow.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
});
