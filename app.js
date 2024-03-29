var createError = require('http-errors');
var compression = require('compression');
var productionMiddleWare = require('./Middleware/ProductionProcessMiddleware');
var fs = require('fs')
var express = require('express');
var expressWinston = require('express-winston');
var winston = require('winston');
var path = require('path');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var logger = require('morgan');
const fileUpload = require('express-fileupload')
var dust = require('express-dustjs');
var helmet = require('helmet');
var csrf = require('csurf');
var appController = require('./controllers/AppController') ;
var dbConnection = require('./db/connection');
const {UUID} = require('./helper/Utils');
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })


var app = express();
app.set('x-powered-by', 'saranlive');

// Dustjs settings
dust._.optimizers.format = function (ctx, node) {
  return node
}

app.use(cookieSession({
  name: '_sl_session',                              // name of the cookie
  secret: UUID(),                                // key to encode session
  maxAge: 24 * 60 * 60 * 1000,                  // cookie's lifespan
  sameSite: 'lax',                              // controls when cookies are sent
  path: '/',                                    // explicitly set this for security purposes
  secure: true,// cookie only sent on HTTPS
  httpOnly: true                                // cookie is not available to JavaScript (client)
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});


app.engine('dust', dust.engine({
  useHelpers: true
}));

app.set('trust proxy', 1);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'dust');

if(process.env.NODE_ENV == 'production'){
  app.use(compression())
  productionMiddleWare.initialize();
  app.use('/static', express.static(path.join(__dirname, "public", "static")));
}else{
  app.use('/dev-assets', express.static(path.join(__dirname, 'app/assets/webpack')));
}

app.use(helmet());
app.use(logger('combined',{ stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(true));
// app.use(csrf({ cookie: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, "public", "assets")));
app.use('/images', express.static(path.join(__dirname, "public", "images")));

app.use(expressWinston.logger({
  transports: [
    new winston.transports.File({ filename: 'application.log' })
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  )
}));

app.use(appController);

app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.File({ filename: 'application.log' })
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  )
}));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(500));
});

// // error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV != 'production' ? err : false;
  res.status(err.status || 500);
  res.render('error',{
    showLoader:true,
    errorClass:'error_screen'
  });
});

module.exports = app;
