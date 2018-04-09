const fs = require('fs');
const _ = require('underscore');
const path = require('path');
// const edl = require('../controllers/edl');
const logger = require('./logger');
const async = require('async');
const { spawn, fork } = require('child_process');
const constants = require('../config');
const resumable = require('./resumable.js')
const DataPumpAPI = require('./api.js');
const glob = require('glob');

const commandExists = require('command-exists');
const temporaryFolder = constants.TEMP_DIRECTORY;
const uploadFolder = constants.UPLOAD_DIRECTORY;

const getParentFolderForFile = (filepath) => {
  const splits = filepath.split(path.sep)
  splits.pop()
  return splits.join(path.sep)
}

const getFilenameFromFilepath = (filepath) => {
  const splits = filepath.split('/')
  return splits[splits.length - 1];
}


class DataPumpUtils {
  static unzipFile(zipfile, exitCallback) {
    const statement = `jar xf "${zipfile}"`;
    // const statement = `unzip ${zipfile}`;
    const t1 = new Date();
    const cwd = getParentFolderForFile(zipfile);

    logger.debug('Unzipping in', cwd)
    const child = spawn(statement, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', function (code, signal) {
      const t2 = new Date();
      const diff = t2.getTime() - t1.getTime();
      const sec = Math.round(diff / 1000);
      if (exitCallback) exitCallback(`Finished unzip process in ${sec} seconds`);
    });
  }

  static bootstrapPath(filepath) {
    if (!fs.existsSync(EDL_STAGING_DIRECTORY)) {
      fs.mkdirSync(EDL_STAGING_DIRECTORY);
    }

    if (!fs.existsSync(filepath)) {
      fs.mkdirSync(filepath);
    }
  }

  static writeUnzip(filename, context) {
    const containingFolder = getParentFolderForFile(filename)
    const actualName = getFilenameFromFilepath(filename);

    DataPumpAPI.createHistoryRecord(Object.assign({}, context, { status: 'PROCESSING_UNZIP' }));

    const setStatusCompleteForPipelineCallback = () => {
      DataPumpAPI.createHistoryRecord(Object.assign({}, context, { status: 'COMPLETED', }))
    }

    const generateRecordsCallback = () => {
      logger.debug('Generating records for ' + containingFolder)
      DataPumpUtils.generateRecordsForGeneratedFiles(containingFolder, context, setStatusCompleteForPipelineCallback)
    }

    
    commandExists('jar', function(err, commandExists){
      if (!commandExists){
        logger.warn('jar command does not exist on this system, skipping unzip')
        logger.warn('Zip files will not be extracted until the JDK is installed.')
        logger.warn('Please install the JDK')
        generateRecordsCallback();
      }
      else {
        DataPumpUtils.unzipFile(filename, generateRecordsCallback)
      }
    })
  }

  static generateRecordsForGeneratedFiles(containingFolder, context, callback) {
    glob(containingFolder + '/**/*.*', (err, files) => {
      async.eachSeries(files, (file, cb) => {
        logger.database(`Generating DB record for ` + file);

        DataPumpAPI.addChildFile({
          identifier: context.identifier,
          filepath: file,
          fileSize: fs.statSync(file).size,
          filename: getFilenameFromFilepath(file),
        })

        cb()
      }, callback)

    })
  }

  static writeFileToServer(identifier, filename, resumable, context) {
    const outputFolder = path.join(constants.UPLOAD_DIRECTORY, identifier)
    const outputFilepath = path.join(outputFolder, filename);
    const isZip = filename.substr(filename.length - 3) === 'zip';

    var stream = fs.createWriteStream(outputFilepath);
    //stitches the file chunks back together to create the original file. 
    // stream.on('data', function (data) { });
    DataPumpAPI.createHistoryRecord(Object.assign({}, context, { status: 'ASSEMBLING_CHUNKS' }));

    stream.on('close', function () {
      if (isZip) {
        DataPumpUtils.writeUnzip(outputFilepath, context)
      }
      else {
        DataPumpUtils.generateRecordsForGeneratedFiles(outputFolder, context, () => {
          DataPumpAPI.createHistoryRecord(Object.assign({}, context, { status: 'COMPLETED' }));
        })
      }
    });

    resumable.write(identifier, stream);

    //delete chunks after original file is re-created. 
    // resumable.clean(identifier);
  }


}


module.exports = DataPumpUtils;