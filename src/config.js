module.exports = {
    interval: 5 * 1000, //5s
    maxDowntime: 10 * 1000, //10s
    serverName: '',
    alert: {
        telegram: {
            token: '',
            chatIds: [

            ],
        }
    },
    networks: [
        {
            name: '',
            localRPC: '',
            remoteRPC: '',
            diff: 0
        }
    ]
}
