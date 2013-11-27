var url = require('url'),
    net = require('net');


module.exports = function (incomingRequest, incomingSocket, head){

    console.log(incomingRequest.connection.remoteAddress + '\t' + incomingRequest.method + '\t' + incomingRequest.url);

    var incomingRequestUrl = url.parse('http://' + incomingRequest.url);

    var outgoingSocket = net.connect(incomingRequestUrl.port, incomingRequestUrl.hostname, function () {
        incomingSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        outgoingSocket.write(head);
        outgoingSocket.pipe(incomingSocket);
        incomingSocket.pipe(outgoingSocket);
    });

    outgoingSocket.on('error', function (error) {
        console.log(incomingRequest.connection.remoteAddress + '\t' + '[ERROR]' + '\t' + error.message);
        incomingSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        incomingSocket.end();
    });

};