
const uuidv4 = require('uuid/v4');
const logger = require('./logger');
const resumable = require('./resumable.js')();
const DataPumpUtils = require('./utils.js');
const DataPumpAPI = require('./api.js');
const _ = require('underscore');
const constants = ('../config.js');


class DataPumpHttp {
  static postUploadChunk(req, res) {
    resumable.post(req, function (status, filename, original_filename, identifier, context) {
      const log = logger.getLogByIdentifier(identifier);
      const {
        resumableChunkNumber = '',
        resumableChunkSize = '',
        resumableCurrentChunkSize = '',
        resumableTotalSize = '',
        resumableType = '',
        resumableIdentifier = '',
        resumableFilename = '',
        resumableRelativePath = '',
        resumableTotalChunks = '',
      } = req.body;
  
      log.chunkPOST(`POST new chunk ${resumableChunkNumber}`, {
        status,
        chunkNumber: resumableChunkNumber,
        chunkSize: resumableChunkSize,
        currentChunkSize: resumableCurrentChunkSize,
        totalChunks: resumableTotalChunks,
        totalSize: resumableTotalSize,
        type: resumableType,
        identifier: resumableIdentifier,
        filename: resumableFilename,
        guid: uuidv4()
      });
  
      if (status === 'done') {
        DataPumpUtils.writeFileToServer(identifier, original_filename, resumable, context)
      }
  
      res.send(status);
    });
  }

  static getUploadChunk(req, res) {
    resumable.get(req, function (status, filename, original_filename, identifier, context) {
      const log = logger.getLogByIdentifier(identifier);
      const {
        resumableChunkNumber = '',
        resumableChunkSize = '',
        resumableCurrentChunkSize = '',
        resumableTotalSize = '',
        resumableType = '',
        resumableIdentifier = '',
        resumableFilename = '',
        resumableRelativePath = '',
        resumableTotalChunks = '',
      } = req.query;
  
      if (status === 'done') {
        DataPumpUtils.writeFileToServer(identifier, original_filename, resumable, context);
        res.status(200).send('done');
      }
      else {
        log.chunkGET(status == 'found' ? 'Chunk found, skipping upload' : 'Chunk not found, marking chunk for upload', {
          status,
          chunkNumber: resumableChunkNumber,
          chunkSize: resumableChunkSize,
          currentChunkSize: resumableCurrentChunkSize,
          totalChunks: resumableTotalChunks,
          totalSize: resumableTotalSize,
          type: resumableType,
          identifier: resumableIdentifier,
          filename: resumableFilename,
          guid: uuidv4()
        });
        res.status((status == 'found' ? 200 : 404)).send(status);
      }
    });
}

  static postNewUploadRecord(req, res) {
    // logger.info(`Owner name is ${ownername}`)
    const { fileSize,
      identifier,
      filename,
      relocation
    } = req.body;
  
    const mainDir = path.dirname(require.main.filename)
    const uploadDir = relocation ? path.join(mainDir, relocation) : constants.UPLOAD_DIRECTORY;
    const outputFolder = path.join(uploadDir, identifier);
    const outputFilepath = path.join(outputFolder, filename);
  
    DataPumpAPI.createHistoryRecord({
      fileSize,
      identifier,
      filename,
      userId: null,
      relocation,
      filepath: outputFilepath,
      ownername: null,
      status: 'UPLOADING'
    })
  
  
    res.sendStatus(200);
  }

  static getLogByIdentifier(req, res) {
    const { id } = req.params;
    logger.getLogOutputByIdentifier({ identifier: id });
  }

  static getDownloadByIdentifier(req, res) {
    resumable.write(req.params.identifier, res);
  }

  static getDownloadByDownloadKey(req, res){
    
    const { downloadKey } = req.params;
    const split = downloadKey.split('|');
    if (split.length !== 2) res.sendStatus(500);

    const identifier = split[0];
    const filename = split[1];
    console.log('getting', identifier, filename)
    DataPumpAPI.getFilepathByIdentifierAndFilename(identifier, filename, (file) => {
      if (!file) res.sendStatus(500);
      else res.download(file.filepath); // Set disposition and send it.
    })
  }

  static postUploadHistory(req, res){
    DataPumpAPI.getHistoryRecords({}, function(err, results){
      res.send(results);
    })
  }

}

module.exports = DataPumpHttp;