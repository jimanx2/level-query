var test = require('tape');
var levelup = require('levelup');
var sublevel = require('level-sublevel');
var through = require('through');
var concat = require('concat-stream');

var db = sublevel(levelup(__dirname + '/data/users', { encoding: 'json' }));
var query = require('../')(db);
var userData = require('./users.json').users;

test('setup', function (t) {
    var pending = userData.length;
    userData.forEach(function (row) {
        db.put(row.id, row, function () {
            if (--pending === 0) t.end();
        });
    });
});

test('all results', function (t) {
    t.plan(1);
    
    var q = query();
    q.pipe(concat(function (body) {
        var rows = JSON.parse(body);
        t.deepEqual(
            rows.map(function (row) {
                return { key: row.key, value: row.value };
            }),
            userData.map(function (row) {
                return { key: row.id, value: row };
            }).sort(cmp)
        );
    }));
    
    function cmp (a, b) {
        return a.key < b.key ? -1 : 1;
    }
});

test('oaklanders', function (t) {
    t.plan(1);
    
    var q = query('/?filter=["location",/\\boakland\\b/i]&map=username');
    q.pipe(concat(function (body) {
        var rows = JSON.parse(body);
        t.deepEqual(rows, userData
            .filter(function (row) {
                return /\boakland\b/i.test(row.location);
            })
            .sort(cmp)
            .map(function (row) { return [ row.username ] })
        );
    }));
    
    function cmp (a, b) {
        return a.location < b.location ? -1 : 1;
    }
});

test('oaklanders with followers and repos', function (t) {
    t.plan(1);
    
    var q = query({
        filter: [ 'location',/\boakland\b/i ],
        map: [ [ 'username', 'repos', 'followers' ] ]
    });
    q.pipe(concat(function (body) {
        var rows = JSON.parse(body);
        t.deepEqual(rows, userData
            .filter(function (row) {
                return /\boakland\b/i.test(row.location);
            })
            .sort(cmp)
            .map(function (row) {
                return [ row.username, row.repos, row.followers ]
            })
        );
    }));
    
    function cmp (a, b) {
        return a.location < b.location ? -1 : 1;
    }
});

test('oaklanders with object map', function (t) {
    t.plan(1);
    
    var q = query({
        filter: [ 'location',/\boakland\b/i ],
        map: { u: 'username', rf: [['repos','followers']] }
    });
    q.pipe(concat(function (body) {
        var rows = JSON.parse(body);
        t.deepEqual(rows, userData
            .filter(function (row) {
                return /\boakland\b/i.test(row.location);
            })
            .sort(cmp)
            .map(function (row) {
                return { u: row.username, rf: [ row.repos, row.followers ] };
            })
        );
    }));
    
    function cmp (a, b) {
        return a.location < b.location ? -1 : 1;
    }
});
