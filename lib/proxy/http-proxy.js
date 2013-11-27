var http = require('http'),
    zlib = require('zlib'),
    url = require('url'),
    util = require('util'),
    async = require('async');



var plugins = {};



function matchRule (filter, request) {
    var property,
        pattern,
        match = true;

    for (property in filter) {
        pattern = new RegExp(filter[property]);
        if (!request[property] || !pattern.test(request[property])) {
            match = false;
            break;
        }
    }

    return match;
}



module.exports = function (incomingRequest, outgoingResponse) {


    var incomingRequestUrl = url.parse(incomingRequest.url);


    async.waterfall([


        //========================================
        //
        // Buffer incoming request
        //
        //========================================

        function (callback) {

            var buffer = '';

            incomingRequest.setEncoding('utf8');

            incomingRequest.on('data', function(chunk){
                buffer += chunk;
            });

            incomingRequest.on('end', callback.bind(this, null, buffer));

        },


        //========================================
        //
        // Handle incoming request
        //
        //========================================

        function (data, callback) {

            var outgoingRequestObject = {
                client: incomingRequest.connection.remoteAddress,
                hostname: incomingRequestUrl.hostname,
                port: incomingRequestUrl.port,
                path: incomingRequestUrl.path,
                method: incomingRequest.method,
                headers: util._extend({}, incomingRequest.headers),
                body: data
            };

            // Apply modifiers
            global.settings.requestRules.forEach(function (rule) {
                var match = matchRule(rule.filter, outgoingRequestObject);
                if (match) {
                    rule.modifiers.forEach(function (modifier) {
                        if (!plugins[modifier]) {
                            try {
                                plugins[modifier] = require('./plugins/' + modifier);
                            } catch (e) {
                                console.log('[SERVER]\t[ERROR]\tCould not load plugin \'' + modifier + '\'');
                            }
                        }
                        if (plugins[modifier] && typeof plugins[modifier].request === 'function') {
                            outgoingRequestObject = plugins[modifier].request(outgoingRequestObject);
                        }
                    });
                }
            });

            callback(null, outgoingRequestObject);

        },


        //========================================
        //
        // Make outgoing request
        //
        //========================================

        function (outgoingRequestObject, callback) {

            var outgoingRequest = http.request(outgoingRequestObject, callback.bind(this, null));

            outgoingRequest.on('error', callback);

            outgoingRequest.write(outgoingRequestObject.body);
            outgoingRequest.end();

        },


        //========================================
        //
        // Buffer incoming response and gunzip/inflate if necessary
        //
        //========================================
        function (incomingResponse, callback) {

            var buffer = [],
                streamHandler;

            switch (incomingResponse.headers['content-encoding']) {
            case 'deflate':
                streamHandler = zlib.createInflate();
                incomingResponse.pipe(streamHandler);
                break;
            case 'gzip':
                streamHandler = zlib.createGunzip();
                incomingResponse.pipe(streamHandler);
                break;
            default:
                streamHandler = incomingResponse;
            }

            streamHandler.on('data', function (chunk) {
                buffer.push(chunk);
            });

            streamHandler.on('end', callback.bind(this, null, incomingResponse, buffer));

            streamHandler.on('error', function (error) {
                callback(error);
            });

        },


        //========================================
        //
        // Handle incoming response
        //
        //========================================

        function (incomingResponse, buffer, callback) {

            var outgoingResponseObject = {
                client: incomingRequest.connection.remoteAddress,
                hostname: incomingRequestUrl.hostname,
                port: incomingRequestUrl.port,
                path: incomingRequestUrl.path,
                statusCode: incomingResponse.statusCode,
                headers: util._extend({}, incomingResponse.headers),
                body: Buffer.concat(buffer)
            };

            // Apply modifiers
            global.settings.responseRules.forEach(function (rule) {
                var match = matchRule(rule.filter, outgoingResponseObject);
                if (match) {
                    rule.modifiers.forEach(function (modifier) {
                        if (!plugins[modifier]) {
                            try {
                                plugins[modifier] = require('./plugins/' + modifier);
                            } catch (e) {
                                console.log('[SERVER]\t[ERROR]\tCould not load plugin \'' + modifier + '\'');
                            }
                        }
                        if (plugins[modifier] && typeof plugins[modifier].response === 'function') {
                            outgoingResponseObject = plugins[modifier].response(outgoingResponseObject);
                        }
                    });
                }
            });


            callback(null, outgoingResponseObject);

        },


        //========================================
        //
        // Gzip/deflate outgoing response if necessary
        //
        //========================================

        function (outgoingResponseObject, callback) {

            switch(outgoingResponseObject.headers['content-encoding']) {
            case 'deflate':

                zlib.deflate(outgoingResponseObject.body, function (error, result) {
                    outgoingResponseObject.body = result;
                    callback(error, outgoingResponseObject, 'binary');
                });
                break;

            case 'gzip':

                zlib.gzip(outgoingResponseObject.body, function (error, result) {
                    outgoingResponseObject.body = result;
                    callback(error, outgoingResponseObject, 'binary');
                });
                break;

            default:
                callback(null, outgoingResponseObject, 'utf8');

            }

        },


        //========================================
        //
        // Send outgoing response
        //
        //========================================

        function (outgoingResponseObject, encoding, callback) {
            outgoingResponseObject.headers['content-length'] = outgoingResponseObject.body.length;
            outgoingResponse.writeHead(outgoingResponseObject.statusCode, outgoingResponseObject.headers);
            outgoingResponse.write(outgoingResponseObject.body, encoding);
            outgoingResponse.end();
        }


    ], function (error) {

        console.log(incomingRequest.connection.remoteAddress + '\t[ERROR]\t' + error);

        outgoingResponse.writeHead(502, {});
        outgoingResponse.end();

    });

};