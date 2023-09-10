const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const labelRouter = require('./routes/label');

const app = express();

app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/draw', labelRouter);
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));
app.all('*', (req, res) => { res.render('404'); });

module.exports = app;