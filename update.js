require('dotenv').config();

if (!process.env.SLACK_BOT_WEBHOOK) {
    console.log('Error: Specify slack token in .env file');
    process.exit(1);
}

var request = require('request');
var xml2json = require('xml2json');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database(

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
