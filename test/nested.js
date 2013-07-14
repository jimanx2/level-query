var test = require('tape');
var levelup = require('levelup');
var sublevel = require('level-sublevel');
var through = require('through');
var concat = require('concat-stream');

var db = sublevel(levelup(__dirname + '/data/nested', { encoding: 'json' }));
var query = require('../')(db);
var nestedData = require('./nested.json');

test('setup', function (t) {
    var pending = nestedData.length;
    nestedData.forEach(function (row) {
        db.put(row.name, row, function () {
            if (--pending === 0) t.end();
        });
    });
});

test('pretty results', function (t) {
    t.plan(2);
    
    var q = query('/?format=pretty');
    q.pipe(concat(function (body) {
        var rows = JSON.parse(body);
        t.deepEqual(rows, nestedData.map(function (row) {
            return { key: row.name, value: row };
        }).sort(cmp));
        t.ok(/^  /.test(body.toString('utf8').split('\n')[1]));
    }));
    
    function cmp (a, b) {
        return a.key < b.key ? -1 : 1;
    }
});
