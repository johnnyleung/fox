var fs = require('fs'),
	http = require('http'),
    httpProxy = require('./http-proxy'),
    httpsProxy = require('./https-proxy');


// Load settings
function loadSettings () {
	var settings = fs.readFileSync('./settings.json', { encoding: 'utf8' });
	try {
		global.settings = JSON.parse(settings);
	} catch (e) {
		console.log('[SERVER]\t[ERROR]\tTrouble parsing settings.json');
	}
	console.log('[SERVER]\t[INFO]\tLoaded settings:', global.settings);
}


// Load initial settings and watch for setting changes
loadSettings();
fs.watch('./settings.json', function (event, filename) {
	if (event === 'change') {
		loadSettings();
	}
});


// Create and start proxy server
var server = http.createServer();
server.on('request', httpProxy);
server.on('connect', httpsProxy);


// Export proxy server
module.exports = server;