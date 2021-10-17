const Web3 = require('web3');
const axios = require('axios');
const bunyan = require('bunyan');
const SentryStream = require('bunyan-sentry-stream').SentryStream;
const raven = require('raven');


const config = require('./config');

const sentryClient = new raven.Client(config.sentryDsn, { /* EXTRAS */ });
const loggerStreams = [
    {
        level: 'debug',
        stream: process.stdout
    },
    {
        level: 'error',
        type: 'raw',
        stream: new SentryStream(sentryClient)
    }
];
const logger = bunyan.createLogger({
    name: config.serverName,
    streams: loggerStreams
});


const downtimeStartedAt = new Map();
const lockStorage = new Map();

async function alert(text) {
    for (const id of config.alert.telegram.chatIds) {
        const url = `https://api.telegram.org/bot${config.alert.telegram.token}/sendMessage?chat_id=${id}&text=${text}`;
        try {
            await axios.get(url, { timeout: 5000 });
        } catch(err) {
            logger.error(url, err.message);
        }
    }
}

async function validate(network) {
    const logger = network.logger;
    logger.info(`Checking ${network.name} is started`);

    const web3Local = new Web3(network.localRPC);
    const web3Remote = new Web3(network.remoteRPC);

    const lastLocalBlock = await web3Local.eth.getBlockNumber();
    const lastRemoteBlock = await web3Remote.eth.getBlockNumber();

    const realDiff = Math.abs(lastLocalBlock - lastRemoteBlock);

    if (realDiff > network.diff) {
        console.log(`Diff (${realDiff}) is more then diff from config`);
        if (!downtimeStartedAt.has(network.name)){
            downtimeStartedAt.set(network.name, Date.now());
            logger.info(`Start downtime ${network.name} : ${downtimeStartedAt.get(network.name)}`);
        } else if (Date.now() - downtimeStartedAt.get(network.name) > config.maxDowntime) {
            const message = `[${config.serverName}] ${network.name} ${network.localRPC} Parser is ${realDiff} behid. Parser block ${lastLocalBlock}; node block ${lastRemoteBlock}`;
            logger.error(message);
            await alert(message);
            downtimeStartedAt.delete(network.name);
        }
    } else {
        downtimeStartedAt.delete(network.name);
    }

    logger.info(`Checking ${network.name} is finished (diff ${realDiff}) localLastBlock = ${lastLocalBlock} lastRemoteBlock = ${lastRemoteBlock}`);
}

async function start () {
    for (let network of config.networks) {
        network.logger = bunyan.createLogger({
            name: network.name,
            streams: loggerStreams
        });

        lockStorage.set(network.name, false);
        setInterval(async () => {
            if (lockStorage.get(network.name)) {
                logger.info(`Process for ${network.name} is working now`)
                return;
            }
            try {
                lockStorage.set(network.name, true);
                logger.info(`Validation for ${network.name} is started`);
                await validate(network);
                logger.info(`Validation for ${network.name} is finished`);
            } catch (e) {
                logger.error(`Error in executing check function`);
            } finally {
                lockStorage.set(network.name, false);
            }
        }, config.interval);
    }
}

start();
