const Web3 = require('web3');
const axios = require('axios');

const config = require('./config');

const downtimeStartedAt = new Map();

async function alert(text) {
    for (const id of config.alert.telegram.chatIds) {
        const url = `https://api.telegram.org/bot${config.alert.telegram.token}/sendMessage?chat_id=${id}&text=${text}`;
        try {
            await axios.get(url, { timeout: 5000 });
        } catch(err) {
            console.error(url, err.message);
        }
    }
}

async function start () {
    for (let network of config.networks) {

        console.log(`Checking ${network.name} is started`);

        const web3Local = new Web3(network.localRPC);
        const web3Remote = new Web3(network.remoteRPC);

        const lastLocalBlock = await web3Local.eth.getBlockNumber();
        const lastRemoteBlock = await web3Remote.eth.getBlockNumber();

        const realDiff = Math.abs(lastLocalBlock - lastRemoteBlock);

        if (realDiff > network.diff) {
            console.log(`Diff (${realDiff}) is more then diff from config`);
            if (!downtimeStartedAt.has(network.name)){
                downtimeStartedAt.set(network.name, Date.now());
                console.log(`Start downtime ${network.name} : ${downtimeStartedAt.get(network.name)}`);
            } else if (Date.now() - downtimeStartedAt.get(network.name) > config.maxDowntime) {
                const message = `[${config.serverName}] ${network.name} ${network.localRPC} Parser is ${realDiff} behid. Parser block ${lastLocalBlock}; node block ${lastRemoteBlock}`;
                console.error(message);
                await alert(message);
                downtimeStartedAt.delete(network.name);
            }
        } else {
            downtimeStartedAt.delete(network.name);
        }

        console.log(`Checking ${network.name} is finished (diff ${realDiff}) localLastBlock = ${lastLocalBlock} lastRemoteBlock = ${lastRemoteBlock}`);
    }
}

let isWorking = false;
setInterval(async () => {
    if (isWorking) {
        console.log('Process is working now')
        return;
    }
    try {
        isWorking = true;
        console.log('Start function execution');
        await start();
        console.log('End function execution');
    } catch (e) {
        console.error(`Error in executing check function`);
    } finally {
        isWorking = false;
    }
}, config.interval);
