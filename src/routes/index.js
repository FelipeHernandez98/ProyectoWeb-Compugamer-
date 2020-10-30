const express = require('express');
const router = express.Router();
const pool = require('../databases');

router.get('/', async(req,res)=>{
    let data = await pool.query('select * from slogan');
    res.render('index',{ data });
});
module.exports = router;