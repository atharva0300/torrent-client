'use strict';   
const fs = require('fs');
const bencode = require('bencode');
const dgram = require('dgram');
// dgram module for UDP connections 
const { constants } = require('fs/promises');
const urlParse = require('url').parse;
const tracker = require('./src/tracker');
const torrentParser = require('./src/torrent-parser');



// reading the torrent file
// receives a buffer 
const torrentFile = fs.readFileSync('./torrents/3-idiots.torrent')
// converting the buffer to string
//console.log(torrentFile.toString('utf8'))

// read the torrent file 
// decoding the buffer to beencidng
const torrent = bencode.decode(fs.readFileSync('./torrents/shmt.torrent'));
console.log(torrent);
//console.log(torrent)
// converting the bencode to string
const trackerURL = torrent.announce.toString('utf8')
console.log(trackerURL)

// extracting different parts of the tracker url
// using the urlParse method 
const url = urlParse(torrent.announce.toString('utf8'));
console.log(url)

tracker.getPeers(torrent , peers => {
    console.log('list of peers : ' , peers);
});



/*
Buffers
console.log(buffer.from('hello world' , 'utf8'))
let temp = buffer.from('hello world' , 'utf8');
console.log(temp.toString('utf8'))
console.log(temp.toString('utf16le'))
console.log(temp.toString('utf-8'))
console.log(temp.toString('hex'))
*/