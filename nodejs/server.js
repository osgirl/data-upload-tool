const express = require('express');
const http = require('http');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
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


const initServer = () => {
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(multipart());
  app.use(cors())
  app.options(config.CORS_ALLOW, cors())
  
  const ensureAuthenticated = function (req, res, next) {
    logger.http('[' + req.ip + '] Request for: ' + req.protocol + '://' + req.get('host') + req.originalUrl);
    //Add authentication method middleware here
    next();
  }
  
  app.use('/static',express.static(__dirname + '/build'));
  app.post('/api/upload', ensureAuthenticated, DataPumpHttp.postUploadChunk);
  app.get('/api/upload', ensureAuthenticated, DataPumpHttp.getUploadChunk);
  app.post('/api/new', ensureAuthenticated, DataPumpHttp.postNewUploadRecord)
  app.get('/api/log/:id', ensureAuthenticated, DataPumpHttp.getLogByIdentifier)
  app.get('/api/download/:downloadKey', ensureAuthenticated, DataPumpHttp.getDownloadByDownloadKey);
  app.post('/api/history', ensureAuthenticated, DataPumpHttp.postUploadHistory)
  // app.get('/api/delete/:identifier', ensureAuthenticated, DataPumpAPI.deleteFile);
  app.get('/ping', (req, res) => res.send('Pong'))
  app.listen(port);
}

if (cluster.isMaster) {
  logger.boot(`Master ${process.pid} is running`);
  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.boot(`worker ${worker.process.pid} died`);
  });
} else {
  initServer();
  logger.boot(`Worker ${process.pid} started`);
}





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