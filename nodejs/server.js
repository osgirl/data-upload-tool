const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors')
const DataPumpHttp = require('./lib/http.js');
const logger = require('./lib/logger.js');
const app = express();
const bodyParser = require('body-parser');
const multipart = require('connect-multiparty');
const commandExists = require('command-exists');

const config = require('./config');

const port = config.PORT || 3200;

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(multipart());

app.use(cors())
app.options(config.CORS_ALLOW, cors())
//Entry point for locking down API routes
const ensureAuthenticated = function (req, res, next) {
  logger.http('[' + req.ip + '] Request for: ' + req.protocol + '://' + req.get('host') + req.originalUrl);

  //Add authentication method middleware here
  next();
}

// app.use(express.static(__dirname + '/build'));



app.post('/api/upload', ensureAuthenticated, DataPumpHttp.postUploadChunk);
app.get('/api/upload', ensureAuthenticated, DataPumpHttp.getUploadChunk);
app.post('/api/new', ensureAuthenticated, DataPumpHttp.postNewUploadRecord)
app.get('/api/log/:id', ensureAuthenticated, DataPumpHttp.getLogByIdentifier)
// app.get('/api/download/:identifier', ensureAuthenticated, DataPumpHttp.getDownloadByIdentifier);
app.get('/api/download/:downloadKey', ensureAuthenticated, DataPumpHttp.getDownloadByDownloadKey);
app.post('/api/history', ensureAuthenticated, DataPumpHttp.postUploadHistory)
// app.get('/api/delete/:identifier', ensureAuthenticated, DataPumpAPI.deleteFile);
app.get('/ping', (req, res) => res.send('Pong'))

app.listen(port);

logger.boot('Running server on port ' + port);

commandExists('jar', function(err, commandExists){
  if (!commandExists){
    logger.warn('-------------------------------------------------')
    logger.warn('jar command was not found on this system!')
    logger.warn('Zip files will not be extracted until the JDK is installed.')
    logger.warn('Please install the JDK')
    logger.warn('-------------------------------------------------')
  }
})