var http = require('http');
var levelup = require('levelup');
var sublevel = require('level-sublevel');

var db = sublevel(levelup(__dirname + '/db', { encoding: 'json' }));
var feast = require('../')(db);

var stringify = require('JSONStream').stringify;

var server = http.createServer(function (req, res) {
    var s = feast(req.url);
    s.on('head', res.writeHead.bind(res));
    s.pipe(res);
});
server.listen(4000);
