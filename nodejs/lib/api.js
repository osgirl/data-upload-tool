const fs = require('fs');
const _ = require('underscore');
const path = require('path');
// const edl = require('../controllers/edl');
const logger = require('./logger');
const async = require('async');
const Datastore = require('nedb');
const { spawn, fork } = require('child_process');
const constants = require('../config');
const resumable = require('./resumable.js')
const glob = require('glob');
const temporaryFolder = constants.TEMP_DIRECTORY;
const uploadFolder = constants.UPLOAD_DIRECTORY;


const fileManifestDb = new Datastore({ filename: './files.db', autoload: true });

const getParentFolderForFile = (filepath) => {
  const splits = filepath.split('/')
  splits.pop()
  return splits.join('/')
}

const getFilenameFromFilepath = (filepath) => {
  const splits = filepath.split('/')
  return splits[splits.length - 1];
}

class DataPumpAPI {
  static createHistoryRecord(options, cb) {
    const log = logger.getLogByIdentifier(options.identifier);

    try {
      const {
        filepath,
        isZip,
        status,
        isExcelSpreadsheet,
        fileSize,
        userId,
        identifier,
        filename,
        parentId,
        ownername,
        relocation,
        numberOfChunks
      } = options;

      

      const pushNewStatus = () => {
        const statusRecord = {
          status,
          createdAt: new Date()
        }

        fileManifestDb.update({ identifier }, { $push: { statuses: statusRecord } }, {}, function () {
          log.database(`Status ${status} inserted for ${identifier}`);
        });
      } 

      fileManifestDb.find({ identifier }, (err, docs) => {
        if (docs.length === 0) {
          const baseDoc = {
            identifier, 
            fileSize: parseInt(fileSize),
            filepath,
            numberOfChunks,
            filename,
            createdAt: new Date(),
            statuses: []
          }
          log.database(`${identifier} record does not exist, bootstrapping record`);
          fileManifestDb.insert(baseDoc, function (err, newDocs) {
            pushNewStatus();
          })
        }
        else {
          pushNewStatus();
        }
      })


    }
    catch (e) {
      console.log(` ERROR Saving history record`, { status, e })
      res.status(500).send(e);
    }
  }

  static getHistoryRecords(options, cb){
    fileManifestDb.find({}, cb)
  }
}

module.exports = DataPumpAPI;