require('dotenv').config();

var request = require('request');
var xml2json = require('xml2json');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database(process.env.DB_FILENAME);

// initialize db
db.serialize(function () {
    initializeDB(db);

    setInterval(function () {

    }, 1000);
})

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
        rank INT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS rank ON games (rank)`);
    db.run(`CREATE TABLE IF NOT EXISTS players (
        game_id INT NOT NULL,
        number INT NOT NULL,
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
