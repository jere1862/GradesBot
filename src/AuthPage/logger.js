
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, prettyPrint, printf, splat } = format;

const tsFormat = () => (new Date()).toUTCString();

const logger = createLogger({
    format: combine(
        prettyPrint(),
        timestamp({format: tsFormat}),
        splat(),
        printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
    ),
    level: 'info',
    transports: [new transports.Console(), new transports.File({filename: 'logs.log'})]
});

module.exports = logger;