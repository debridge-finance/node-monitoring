module.exports = {
    interval: 5 * 1000, //5s
    maxDowntime: 10 * 1000, //10s
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
            local: '',
            remote: '',
            diff: 0
        }
    ]
}
