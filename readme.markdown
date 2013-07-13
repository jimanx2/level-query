# level-query

search your leveldb from the query string!

# example

## basic queries

With a leveldb populated with
[github user data](https://api.github.com/legacy/user/search/followers:>170?sort=followers&order=desc&start_page=0),

we can sort by a key:

``` js
$ curl -s 'http://localhost:4000/?sort=repos&limit=3&order=desc'
[{"key":"user-443562","value":{"id":"user-443562","gravatar_id":"b7fa89418f6767ac5fe5bfbe8e86a014","username":"vim-scripts","login":"vim-scripts","name":null,"fullname":null,"location":null,"language":"VimL","type":"user","public_repo_count":4442,"repos":4442,"followers":1802,"followers_count":1802,"score":1,"created_at":"2010-10-18T07:02:53Z","created":"2010-10-18T07:02:53Z"},"index":["repos",4442]},
{"key":"user-12631","value":{"id":"user-12631","gravatar_id":"d4a2f12ceae3b7f211b661576d22bfb9","username":"substack","login":"substack","name":"James Halliday","fullname":"James Halliday","location":"Oakland, California, USA","language":"JavaScript","type":"user","public_repo_count":428,"repos":428,"followers":2332,"followers_count":2332,"score":1,"created_at":"2008-06-04T23:33:44Z","created":"2008-06-04T23:33:44Z"},"index":["repos",428]},
{"key":"user-39759","value":{"id":"user-39759","gravatar_id":"fcc9bbfe2a31c5a6225cc287ed7ae2a6","username":"maxogden","login":"maxogden","name":"Max Ogden","fullname":"Max Ogden","location":"Oakland, CA","language":"JavaScript","type":"user","public_repo_count":310,"repos":310,"followers":1053,"followers_count":1053,"score":1,"created_at":"2008-12-11T06:52:00Z","created":"2008-12-11T06:52:00Z"},"index":["repos",310]}]
```

we can map the results to get more compact output:

```
$ curl -sg 'http://localhost:4000/?sort=repos&limit=10&order=desc&map=[["username","repos","location"]]'
[["vim-scripts",4442,null],
["substack",428,"Oakland, California, USA"],
["maxogden",310,"Oakland, CA"],
["drnic",299,"Palo Alto, CA, USA"],
["isaacs",291,"Oakland CA"],
["miyagawa",250,"San Francisco, CA"],
["visionmedia",213,"Victoria, BC, Canada"],
["steveklabnik",181,"Santa Monica, CA"],
["creationix",176,"Red Lick, TX, USA"],
["tenderlove",163,"Seattle"]]
```

we can filter by a regular expression:

```
 $ curl -sg 'http://localhost:4000/?filter=["location",/land\b/i]&map=[["username","location"]]'
[["mattgemmell","Edinburgh, Scotland (UK)"],
["josevalim","Kraków, Poland"],
["addyosmani","London, England"],
["isaacs","Oakland CA"],
["maxogden","Oakland, CA"],
["substack","Oakland, California, USA"],
["torvalds","Portland, OR"]]
```

we can sort and filter at the same time:

```
$ curl -sg 'http://localhost:4000/?sort=followers&filter=["location",/land\b/i]&map=[["username","followers","location"]]'
[["mattgemmell",972,"Edinburgh, Scotland (UK)"],
["maxogden",1053,"Oakland, CA"],
["isaacs",2020,"Oakland CA"],
["josevalim",2210,"Kraków, Poland"],
["substack",2332,"Oakland, California, USA"],
["addyosmani",4759,"London, England"],
["torvalds",11062,"Portland, OR"]]
```

By default we get a complete json result, but we can ask for newline-delimited
json with `format=ndj`:

```
$ curl -sg 'http://localhost:4000/?sort=followers&filter=["location",/land\b/i]&map=[["username","followers","location"]]&format=ndj'
["mattgemmell",972,"Edinburgh, Scotland (UK)"]
["maxogden",1053,"Oakland, CA"]
["isaacs",2020,"Oakland CA"]
["josevalim",2210,"Kraków, Poland"]
["substack",2332,"Oakland, California, USA"]
["addyosmani",4759,"London, England"]
["torvalds",11062,"Portland, OR"]
```

## nested data

For a dataset with more nested data, we can use
[pathway](https://npmjs.org/package/pathway)-style array paths,
which is the key path format originally pioneered by
[JSONStream](https://npmjs.org/package/JSONStream).parse().

First, here's the complete data:

```
$ curl -sg 'http://localhost:4000/?format=pretty'
[{
  "key": "dominictarr",
  "value": {
    "name": "dominictarr",
    "location": {
      "country": {
        "short": "NZ",
        "long": "New Zealand"
      },
      "city": "Auckland"
    }
  }
},
{
  "key": "rvagg",
  "value": {
    "name": "rvagg",
    "location": {
      "country": {
        "short": "AU",
        "long": "Australia"
      },
      "state": {
        "short": "NSW",
        "long": "New South Wales"
      }
    }
  }
},
{
  "key": "substack",
  "value": {
    "name": "substack",
    "location": {
      "country": {
        "short": "USA",
        "long": "United States of America"
      },
      "state": {
        "short": "CA",
        "long": "California"
      },
      "city": "Oakland"
    }
  }
}]
```

Now we can filter by an array path:

```
$ curl -sg
'http://localhost:4000/?filter=["location","country","short","USA"]&map=name'
[["substack"]]
```

Array paths can even have regex:

```
$ curl -sg 'http://localhost:4000/?filter=["location","city",/land$/i]&map=name'
[["dominictarr"],
["substack"]]
```

## server code

Here's the example server we've been using to respond to requests on the query string:

``` js
var http = require('http');
var concat = require('concat-stream');

var levelup = require('levelup');
var sublevel = require('level-sublevel');

var db = sublevel(levelup(__dirname + '/db', { encoding: 'json' }));
var query = require('../')(db);

var server = http.createServer(function (req, res) {
    if (req.method === 'GET') {
        res.setHeader('content-type', 'application/json');
        
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
```

To populate the database, send some `POST`s with JSON to
`http://localhost:4000/$ID`.

# query parameters

Specify any of the following on the query string:

## sort

Sort the results by the value defined at the sort parameter array path into the
nested document using [level-search](https://npmjs.org/package/level-search).

If the sort parameter is just a string, it will be lifted to an array with a
single item.

The elements in the array path can be strings, booleans, and regex.
For more about how array paths work, read about
[JSONStream](https://npmjs.org/package/JSONStream).parse()
and [pathway](https://github.com/substack/node-pathway).

## filter

Filter the results by the existence or match of data at the array path into the
nested document. For leaf nodes, equality or regex test is used. For non-leaf
nodes, the existence of a matching key is used.

If the filter parameter is just a string, it will be lifted to an array with a
single item.

The elements in the array path can be strings, booleans, and regex.
For more about how array paths work, read about
[JSONStream](https://npmjs.org/package/JSONStream).parse()
and [pathway](https://github.com/substack/node-pathway).

## format

* "json" - the default: results are complete json documents you can call
JSON.parse() on the entire response. Note that 
* "pretty" - display a complete json document, but with 2-space indentation and
human-readable whitespace
* "ndj" - [newline delimited json](http://trephine.org/t/index.php?title=Newline_delimited_JSON):
newline-separated lines of json 

## map

Use map to limit which elements are shown in the results.

If `map` is an array, it will be used as an
[array path](https://github.com/substack/node-pathway)
to select results explicitly from the nested document.

If `map` is an object, it maps names to show in the output to 
[array paths](https://github.com/substack/node-pathway) into the document:

```
$ curl -sg 'http://localhost:4000/?map={"name":"name","from":["location","country","short"]}'
[{"name":"dominictarr","from":"NZ"},
{"name":"rvagg","from":"AU"},
{"name":"substack","from":"USA"}]
```

If `map` isn't an object or an array, it will be lifted into a single-item
array.

## order

Use the string `desc` for descending elements or `asc` for ascending elements.
The default mode is ascending.

By default in leveldb all results are ascending and you set the `reverse`
parameter to `true` when you want descending results.

## limit

Show at most `limit` many results.

## min

Establish a lower bound based on the key name, inclusive.

## max

Establish an upper bound based on the key name, inclusive.

# todo

* stream mode: dead, live, follow
* patch level-search to detect which index it should filter on
* fix bugs setting min/max and filter/sort at the same time

# install

With [npm](https://npmjs.org) do:

```
npm install level-query
```

# license

MIT
