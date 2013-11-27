var http = require('http');


module.exports = function (incomingRequest, outgoingResponse) {

    console.log(incomingRequest.connection.remoteAddress + '\t' + incomingRequest.method + '\t' + incomingRequest.url);

    var outgoingRequest = http.request({

        host: incomingRequest.headers.host,
        path: incomingRequest.url,
        method: incomingRequest.method,
        headers: incomingRequest.headers

    }, function(incomingResponse) {

        outgoingResponse.writeHead(incomingResponse.statusCode, incomingResponse.headers);
        incomingResponse.pipe(outgoingResponse);

    });

    outgoingRequest.on('error', function (error) {
        console.log(incomingRequest.connection.remoteAddress + '\t' + '[ERROR]' + '\t' + error.message);
        outgoingResponse.writeHead(502);
        outgoingResponse.end();
    });

    incomingRequest.pipe(outgoingRequest);

};