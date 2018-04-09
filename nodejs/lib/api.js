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
            downloadKey : `${identifier}|${filename}`,
            createdAt: new Date(),
            statuses: [],
            children: []
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

  static getFilepathByIdentifierAndFilename(identifier, filename, cb){
    fileManifestDb.find({ identifier }, (err, docs) => {
      if (docs.length === 1){
        const filepath = _.find(docs[0].children, c => c.filename === filename);
        cb(filepath)
      }
      else {
        cb(null)
      }
    })
  }

  static addChildFile(options, cb){
    const log = logger.getLogByIdentifier(options.identifier);
    const {
      identifier,
      filename,
      filepath,
      fileSize
    } = options;
    fileManifestDb.find({ identifier }, (err, docs) => {
      if (docs.length === 0) {
        logger.error(`Error adding generated file to identifier, identifier ${identifier} does not exist`);
        cb()
      }
      else {
        const doc = _.first(docs);
        const exists = _.find(doc.children, c => c.filename === filename);
        if (exists) {
          log.warn(`Filename ${filename} already exists as child item, skipping`)
        }
        else {
          const newDoc = {
            downloadKey : `${identifier}|${filename}`,
            filepath, 
            filename, 
            fileSize
          }
          fileManifestDb.update({ identifier }, { $push: { children: newDoc } }, {}, function () {
            log.database(`File ${filename} inserted as child for ${identifier}`);
          });
        }
        
      }
    })
    
  }
}

module.exports = DataPumpAPI;