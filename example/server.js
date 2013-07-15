var http = require('http');
var concat = require('concat-stream');

var levelup = require('levelup');
var sublevel = require('level-sublevel');

var db = sublevel(levelup(__dirname + '/db', { encoding: 'json' }));
var query = require('../')(db);

db.batch(require('../test/nested.json').map(function (row) {
    return { type: 'put', key: row.name, value: row };
}));

var server = http.createServer(function (req, res) {
    if (req.method === 'GET') {
        res.setHeader('content-type', 'application/json');
        res.setTimeout(0);
        
        var q = query(req.url);
        q.on('error', function (err) { res.end(err + '\n') });
        q.pipe(res);
    }
    else if (req.method === 'POST') {
        req.pipe(concat(function (body) {
            db.put(req.url.slice(1), JSON.parse(body));
            res.end('ok\n');
        }));
    }
    else res.end();
});
server.listen(4000);
