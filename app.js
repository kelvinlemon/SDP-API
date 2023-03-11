var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cors = require('cors');


var monk = require('monk');
var db = monk('mongodb+srv://db-test:MWphuRTxI6xuu1wJ@cluster0.4mvhq1n.mongodb.net/SDP-db?retryWrites=true&w=majority');

var session = require('express-session');

var notesRouter = require('./routes/notes');
const cookieParser = require('cookie-parser');

var app = express();

/*var corsOptions = {
    origin: ['http://127.0.0.1:3000', 'http://localhost:3000'],
    credentials: true
};*/

var corsOptions = {
    origin: '*',
    credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser())


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
}));

// Make our db accessible to routers 
app.use(function(req,res,next){
    req.db = db; 
	next();
});

app.options('*', cors(corsOptions));
app.use('/', notesRouter);

// for requests not matching the above routes, create 404 error and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development environment
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

//module.exports = app;
app.listen(process.env.PORT || 3001);
