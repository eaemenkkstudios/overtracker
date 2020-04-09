const ow = require('oversmash').default();
const firebase = require('firebase');
const firebaseConfig = require('../config.json');

firebase.initializeApp(firebaseConfig);

module.exports = {
    async addPlayerToList(req, res){
        const token = req.header.authentication;
        const { battleTag } = req.params;
        const { email } = req.body;
    },
}