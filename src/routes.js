const express = require('express');

const routes = express.Router();

const PlayerController = require('./controllers/PlayerController');

routes.get('/hello', (req, res) => {
    res.json({ hello: 'World' });
});

routes.post('/add/:battleTag', PlayerController.addPlayerToList);

module.exports = routes; 