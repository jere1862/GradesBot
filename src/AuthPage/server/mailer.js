const nodemailer = require('nodemailer');
const aws = require('aws-sdk');
const logger = require('../logger');

aws.config.region = "us-east-1";

class Mailer {
    constructor(recipients) {
        this.transporter = nodemailer.createTransport({
            SES: new aws.SES({
                apiVersion: '2010-12-01'
            })
        });

        this.recipients = recipients;
    }

    sendMail(recipients, subject) {
        logger.info("Sending mail to [%s]", recipients.join(' '));
        this.transporter.sendMail({
            from: 'UdeS Grades <do-not-reply@udesgrades.com>',
            to: recipients,
            subject: 'You got a new grade!',
            text: `100% partout dans ${subject}`
        }, (err, info) => {
            if(err) logger.error(err);
            logger.debug(info);
        });
    }

    sendBatchMail(subject) {
        let recipients = [...this.recipients];
        let chunks = this.chunkify(recipients, 10);
        let x = 0;
        let self = this;

        const intervalId = setInterval(function() {
            self.sendMail(chunks[x], subject);

            if(++x == chunks.length) {
                clearInterval(intervalId);
            }
        }, 2000);
    }

    chunkify(array, chunkSize) {
        let R = [];
        for (let i=0; i<array.length; i+=chunkSize)
            R.push(array.slice(i,i+chunkSize));
        return R;
    }
}

let test = new Mailer(["j-roy95@hotmail.com", "jeremie.roy2@usherbrooke.ca"]);

test.sendBatchMail('Éthique');
