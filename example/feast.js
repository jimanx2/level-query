var http = require('http');
var concat = require('concat-stream');

var levelup = require('levelup');
var sublevel = require('level-sublevel');

var db = sublevel(levelup(__dirname + '/db', { encoding: 'json' }));
var feast = require('../')(db);

var server = http.createServer(function (req, res) {
    if (req.method === 'GET') {
        res.setHeader('content-type', 'application/json');
        
        var s = feast(req.url);
        s.on('error', function (err) { res.end(err + '\n') });
        s.pipe(res);
    }
    else if (req.method === 'POST') {
        req.pipe(concat(function (body) {
            db.put(req.url.slice(1), JSON.parse(body));
            res.end('ok\n');
        }));
    }
    else {
        res.statusCode = 404;
        res.end();
    }
});
server.listen(4000);
