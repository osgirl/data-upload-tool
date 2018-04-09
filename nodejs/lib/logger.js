'use strict'
const winston = require('winston');
const fs = require('fs');
const _ = require('underscore');
const path = require('path');
const stripAnsi = require('strip-ansi');
const constants = require('../config');

const { fork } = require('child_process');

const { LOG_FOLDER, LOG_FILE, UPLOAD_DIRECTORY, LOG_LEVELS } = constants;

const logLevels = LOG_LEVELS;

//see logLevels.levels for complete list. 'debug' is the most verbose
//                 should be 'http' for production
const DEFAULT_LOG_LEVEL = 'debug';

winston.addColors(logLevels);





class DataPipelineLogger {
    static checkDirectorySync(directory) {
        try {
            fs.statSync(directory);
        } catch (e) {
            fs.mkdirSync(directory);
        }
    }

    //Concise example of how simple it is to send an endless stream of data to the browser
    //https://truffles.me.uk/real-time-the-easy-way-with-eventsource
    static sendSse(name, data, id, res) {
        res.write("event: " + name + "\n");
        if (id) res.write("id: " + id + "\n");
        res.write("data: " + JSON.stringify(data) + "\n\n");
    }


    static getConsoleFormatter() {
        return winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            // winston.format.align(),
            winston.format.printf((info) => {
                const {
                    timestamp, level, message
                } = info;

                const ts = timestamp.replace('T', ' ').replace('Z', '');
                return `${ts} ${level}: ${message}`;
            }));
    }

    static getFileFormatter() {
        return winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(info => {
                return JSON.stringify(info)
            })
        )
    }

    static getFileTransportsPerLevel(logFile, levels = LOG_LEVELS.levels) {
        const logFileBase = logFile.replace('.log', '');
        return _.map(levels, (idx, level) => new winston.transports.File({
            filename: `${logFileBase}.${level}.log`,
            level,
            colorize: false,
            format: winston.format.combine(
                winston.format.timestamp(),
                // winston.format.align(),
                winston.format.printf((info) => {
                    const {
                        timestamp, level, message
                    } = info;


                    const ts = timestamp.replace('T', ' ').replace('Z', '');


                    return stripAnsi(`${ts} ${level}: ${message}`);
                }))
        }))
    }

}

const logstore = {}
const logger = winston.createLogger({
    level: DEFAULT_LOG_LEVEL,
    levels: logLevels.levels,
    format: DataPipelineLogger.getConsoleFormatter(),
    transports: [
        new winston.transports.File({ filename: LOG_FILE }),
        new winston.transports.File({ filename: LOG_FILE + '.error', level: 'error' }),
        new winston.transports.Console()
    ]
});

const edlLogCache = {};
let logStreamStore = {};

class LogFactory {

    static createLogFileIfNotExist(identifier) {
        identifier = identifier || 'log';
        const edlDirectory = path.join(UPLOAD_DIRECTORY, identifier)
        const file = path.join(edlDirectory, 'log.log')

        if (!fs.existsSync(file)) {
            DataPipelineLogger.checkDirectorySync(edlDirectory);
            fs.writeFile(file, '', { flag: 'wx' }, function (err) {
                if (err) logger.error('Error creating new log file', { err, identifier, file })
                logger.debug('Created new log file', { identifier, file })
            });
        }
        return file;
    }

    static getLogFileLocation(identifier) {
        identifier = identifier || 'log';
        const file = LogFactory.createLogFileIfNotExist(identifier)
        return file;
    }

    static getLogByIdentifier(identifier) {
        identifier = identifier || 'log';
        if (edlLogCache[identifier]) {
            return edlLogCache[identifier];
        }

        const logFile = LogFactory.getLogFileLocation(identifier);
        const newLog = winston.createLogger({
            level: 'http',
            levels: LOG_LEVELS.levels,
            format: DataPipelineLogger.getFileFormatter(),
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log` 
                // - Write all logs error (and below) to `error.log`.
                //
                new winston.transports.File({ filename: logFile, level: 'http' }),
                new winston.transports.File({ filename: logFile + '.error', level: 'error' }),
                new winston.transports.Console({ format: DataPipelineLogger.getConsoleFormatter() })
            ]
        });

        edlLogCache[identifier] = newLog;
        return newLog;
    }

    static getLogOutputByIdentifier({ userId, identifier, res }) {
        const filename = LogFactory.getLogFileLocation(identifier);

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        let log;
        const cacheLog = logStreamStore[userId];
        const transporter = new winston.transports.File({ filename, level: 'http' });
        if (cacheLog) {
            cacheLog.clear();
            cacheLog.add(transporter);
            log = cacheLog;
            logger.debug('Existing stream in play, returning', { userId, identifier })
        }
        else {
            log = winston.createLogger({
                level: 'http',
                levels: LOG_LEVELS.levels,
                format: DataPipelineLogger.getFileFormatter(),
                transports: [transporter]
            });
            logStreamStore[userId] = log;
            logger.streamOPEN('New stream open', { userId, identifier })
        }

        transporter.stream({ start: -1 }).on('log', (info) => DataPipelineLogger.sendSse('message', info, null, res));
        logger.streamOPEN(`Current open streams in cache`, { count: _.keys(logStreamStore).length })
    }
}



  process.on('uncaughtException', function (error) {
    logger.error(`Uncaught exception ${error}`)
    logger.error(error.stack)
    console.log(`Uncaught exception ${error}`)
    console.log(error.stack)
  });
  
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: ' + 'reason: ' + reason);
    console.log(p)
    logger.error('Unhandled Rejection at: ' + p + 'reason: ' + reason);
    // application specific logging, throwing an error, or other logic here
  });

DataPipelineLogger.checkDirectorySync(LOG_FOLDER);
logger.getLogByIdentifier = LogFactory.getLogByIdentifier;
logger.getLogOutputByIdentifier = LogFactory.getLogOutputByIdentifier;
logger.LogFactory = LogFactory;
logger.DataPipelineLogger = DataPipelineLogger;
module.exports = logger;
