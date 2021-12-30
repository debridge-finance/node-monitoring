const Web3 = require('web3');
const axios = require('axios');
const bunyan = require('bunyan');

const config = require('./config');

const logger = bunyan.createLogger({ name: config.serverName });


const downtimeStartedAt = new Map();
const lockStorage = new Map();

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

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

    const lastLocalBlock = await backoff(web3Local.eth.getBlockNumber(), 8);
    const lastRemoteBlock = await backoff(web3Remote.eth.getBlockNumber(), 8);

    const realDiff = Math.abs(lastLocalBlock - lastRemoteBlock);

    if (realDiff > network.diff || lastLocalBlock === 0 || lastRemoteBlock === 0) {
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

async function backoff (func, retries_number, delay = 1000) {
    let result = 0;
    try {
        logger.info(`Try to exec function "${func}" with ${retries_number} retries and ${delay}ms delay`);
        result = await func;
    } catch (e) {
        if (retries_number > 1) {
            await wait(delay);
            result = await backoff(func,retries_number-1, delay * 2);
        } else {
            logger.error(`Error retries did not help with error: ${e}`);
        }
    }
    return result;
}

async function start () {
    for (let network of config.networks) {
        network.logger = bunyan.createLogger({ name: network.name });

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
