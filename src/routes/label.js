const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    if(req.app.get('authorized')[0])
        res.render('label');
    else
        res.render('403');
});

module.exports = router;