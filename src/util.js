'use strict';

const crypto = require('crypto');

let id = null;

module.exports.genId = () => {
    if(!id){
        id = crypto.randomBytes(20);
        // create an id of 20 bytes
        Buffer.from('~AT0001~').copy(id ,0);
    }

    return id;
}