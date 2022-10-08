'use strict';

const dgram = require('dgram');
const buffer = require('buffer').Buffer;
const urlParse = require('url').parse;
// importing cryto module to create a random number 
const crypto = require('crypto');
const torrentParser = require('./torrent-parser');
const util = require('./util');

// exporting the getPeers function
module.exports.getPeers = (torrent , callback) => {
    // taking the torrent file and the callback function as an argument 

    // creating a udp connection socket
    const socket=  dgram.createSocket('udp4');
    // converting the torrent's data to string
    const url = torrent.announce.toString('utf8');

    // 1. send connection request 
    udpSend(socket , buildConnReq , url);
    
    socket.on('message' , response => {
        if(respType(response)=='connect'){
            // if the response type is connect
            // 2. receive and parse connect response

            const connResp = parseConnResp(response);
            // 3. send announce request

            const announceReq = buildAnnounceReq(connResp.connectionId , torrent);
            udpSend(socket , announceReq , url);
        }else if(respType(response)==='announce'){
            // 4. parse announce response
            const announceResp = parseAnnounceResp(response);

            // 5. pass peers to callback
            callback(announceResp.peers);
        }
    });

}

function udpSend(socket , message, rawUrl , callback = () => {}){
    const url = urlParse(rawUrl);
    // parsing the url. converting it into JSON format

    // sending the buffer message to the tracker server
    socket.send(message , 0  , message.length , url.port , url.host , callback);
    // message => the buffer data
    // 0 => offset of the buffer ( starting index )
    // message.length => length of the beffur message ( the ending index )
    // url.port => the port of the tracking server
    // url.host => the host name of the tracker server
    // () => {} call back function

    /*
    1. Send a connect request
    2. Get the connect response and extract the connection id
    3. Use the connection id to send an announce request - this is where we tell the tracker which files we’re interested in
    4. Get the announce response and extract the peers list
    */

}



function respType(resp){
    
}

function buildConnReq(){

    /*

    Connect Request format :

    Offset  Size            Name            Value
    0       64-bit integer  connection_id   0x41727101980
    8       32-bit integer  action          0 // connect
    12      32-bit integer  transaction_id  ? // random
    16

    */


    const buf = buffer.alloc(16);
    // creating a buffer of size => 16 bits

    // writeUInt32BE => writing unsigned 32 bits value in Big-endian format

    // connection ID
    buf.writeUInt32BE(0x417 , 0);
    // 0 => offset
    buf.writeUInt32BE(0x27101980 , 4);
    // 4 => the offset value
    // the connection ID consists of 64 bits ( 8 bytes )
    // the first 4 bytes ( 32 bits ) is already taken
    // the next data needs to be inserted at 32 bits ( 4 bytes ) offset position

    // action
    buf.writeUInt32BE(0 , 8);
    // 0 => connect action
    // 8 => offset

    // transaction ID 
    crypto.randomBytes(4).copy(buf , 12);
    // create a random transaction ID of size 4 bytes 
    // and write it, with offset set to 12 bytes

    // the total size of the connect request message is 
    // connection ID + action + transaction ID 
    // 8 + 4 + 4 = 16 bytes

    return buf;
}

function parseConnResp(resp){
    /*

    Response Format :

    Offset  Size            Name            Value
    0       32-bit integer  action          0 // connect
    4       32-bit integer  transaction_id
    8       64-bit integer  connection_id
    16

    */

    return{
        action : resp.readUInt32BE(0),
        transactionId : resp.readUInt32BE(4),
        connectionId : resp.slice(8)
    }
}

function buildAnnounceReq(connId){
    /*

    Announce request : 

    Offset  Size    Name    Value
    0       64-bit integer  connection_id
    8       32-bit integer  action          1 // announce
    12      32-bit integer  transaction_id
    16      20-byte string  info_hash
    36      20-byte string  peer_id
    56      64-bit integer  downloaded
    64      64-bit integer  left
    72      64-bit integer  uploaded
    80      32-bit integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
    84      32-bit integer  IP address      0 // default
    88      32-bit integer  key             ? // random
    92      32-bit integer  num_want        -1 // default
    96      16-bit integer  port            ? // should be betwee
    98

    */

    const buf = buffer.allocUnsafe(98);

    // connection ID 
    connId.copy(buf, 0);
    // action
    buf.writeUInt32BE(1, 8);
    // transaction id
    crypto.randomBytes(4).copy(buf, 12);
    // info hash
    torrentParser.infoHash(torrent).copy(buf, 16);
    // peerId
    util.genId().copy(buf, 36);
    // downloaded
    Buffer.alloc(8).copy(buf, 56);
    // left
    torrentParser.size(torrent).copy(buf, 64);
    // uploaded
    Buffer.alloc(8).copy(buf, 72);
    // event
    buf.writeUInt32BE(0, 80);
    // ip address
    buf.writeUInt32BE(0, 80);
    // key
    crypto.randomBytes(4).copy(buf, 88);
    // num want
    buf.writeInt32BE(-1, 92);
    // port
    buf.writeUInt16BE(port, 96);


    return buf;
    

}

function parseAnnounceResp(resp){

    /*
    Announce Response

    Offset      Size            Name            Value
    0           32-bit integer  action          1 // announce
    4           32-bit integer  transaction_id
    8           32-bit integer  interval
    12          32-bit integer  leechers
    16          32-bit integer  seeders
    20 + 6 * n  32-bit integer  IP address
    24 + 6 * n  16-bit integer  TCP port
    20 + 6 * N

    */

    function group(iterable , groupSize){
        let groups = [];
        for(let i=0;i<iterable.length;i += groupSize){
            groups.push(iterable.slice(i , i + groupSize));
        }

        return groups;
    }


    return {
        action : resp.readUInt32BE(0),
        transactionId : resp.readUInt32BE(4),
        leachers : resp.readUInt32BE(8),
        seeders : resp.readUInt32BE(12),
        peers : group(resp.slice(20) , 6).map(address => {
            return{
                ip : address.slice(0,4).join('.'),
                port : address.readUInt32BE(4)
            }
        })
    }
}

