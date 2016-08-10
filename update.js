require('dotenv').config();

var request = require('request');
var xml2json = require('xml2json');
var sqlite3 = require('sqlite3').verbose();
var prettyjson = require('prettyjson');

var db = new sqlite3.Database(process.env.DB_FILENAME);

db.serialize(function () {
    initializeDB(db);

    //db.run(`INSERT INTO games (id, name) VALUES (1, 'a'), (2, 'b')`);

    db.get(`SELECT * FROM games ORDER BY updated_at DESC LIMIT 1`, function (err, row) {
        var id = 1;
        if (row) {
            id = row.id + 1;
        }
        setInterval(function () {
            bgg('/thing', {id: id, stats: 1}, function (res) {
                // An error has occurred with this thing
                if ('div' in res || !('item' in res.items)) {
                    return;
                }

                var info = res.items.item;

                // Ignore accessories
                if (info.type == 'boardgameaccessory' ||
                    info.type == 'videogame' ||
                    info.type == 'rpgitem') {
                    return false;
                }

                var name = (info.name instanceof Array) ? info.name[0].value : info.name.value;
                var rank = (info.statistics.ratings.ranks.rank instanceof Array) ?
                    info.statistics.ratings.ranks.rank.filter(function (elem) {
                        return elem.name == 'boardgame';
                    })[0].value
                    : info.statistics.ratings.ranks.rank.value;
                var playersArray = info.poll.filter(function (elem) {
                    return elem.name == 'suggested_numplayers';
                })[0].results;
                console.log('Added: ' + name);
                db.run(`INSERT OR REPLACE INTO games
                    (id, name, type, thumbnail, image, description, year, min_players,
                    max_players, playtime, min_playtime, max_playtime, users_rated,
                    rating_average, rating_bayes, stddev, rank)
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        info.id,
                        name,
                        info.type,
                        info.thumbnail,
                        info.image,
                        info.description,
                        info.yearpublished.value,
                        info.minplayers.value,
                        info.maxplayers.value,
                        info.playingtime.value,
                        info.minplaytime.value,
                        info.maxplaytime.value,
                        info.statistics.ratings.usersrated.value,
                        info.statistics.ratings.average.value,
                        info.statistics.ratings.bayesaverage.value,
                        info.statistics.ratings.stddev.value,
                        rank
                    ]
                );
                if (playersArray instanceof Array) {
                    playersArray.forEach(function (elem) {
                        var best = parseInt(elem.result[0].numvotes);
                        var recommended = parseInt(elem.result[1].numvotes);
                        var bad = parseInt(elem.result[2].numvotes);
                        var total = best + recommended + bad;
                        var or_more_reg = elem.numplayers.match(/([\d]+)\+/);
                        var number = or_more_reg ? or_more_reg[1] : elem.numplayers;
                        var or_more = or_more_reg ? 1 : 0;
                        db.run(`INSERT OR REPLACE INTO players
                            (game_id, number, best, recommended, bad, weighted, or_more)
                            values (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                info.id,
                                number,
                                total == 0 ? 0 : (best / total),
                                total == 0 ? 0 : (recommended / total),
                                total == 0 ? 0 : (bad / total),
                                0,
                                or_more
                            ]
                        );
                    });
                }
            });
            id += 1;
        }, 1000);
    });
})

function bgg(path, options, callback) {
    var api = 'https://www.boardgamegeek.com/xmlapi2';
    request({
        url: api + path,
        qs: options
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            callback(xml2json.toJson(body, {object: true}));
        }
    });
}

function initializeDB(db) {
    db.run(`CREATE TABLE IF NOT EXISTS games (
        id INT PRIMARY KEY NOT NULL,
        name TEXT,
        type TEXT,
        thumbnail TEXT,
        image TEXT,
        description TEXT,
        year TEXT,
        min_players INT,
        max_players INT,
        playtime INT,
        min_playtime INT,
        max_playtime INT,
        users_rated INT,
        rating_average REAL,
        rating_bayes REAL,
        stddev REAL,
        rank INT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS rank ON games (rank)`);
    db.run(`CREATE TABLE IF NOT EXISTS players (
        game_id INT NOT NULL,
        number INT NOT NULL,
        or_more INT NOT NULL DEFAULT 0,
        best REAL NOT NULL,
        recommended REAL NOT NULL,
        bad REAL NOT NULL,
        weighted REAL NOT NULL
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS game_id ON players (game_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS number ON players (number)`);
    db.run(`CREATE INDEX IF NOT EXISTS best ON players (best)`);
    db.run(`CREATE INDEX IF NOT EXISTS recommended ON players (recommended)`);
    db.run(`CREATE INDEX IF NOT EXISTS bad ON players (bad)`);
    db.run(`CREATE INDEX IF NOT EXISTS weighted ON players (weighted)`);
}
