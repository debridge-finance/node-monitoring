module.exports = {
    interval: 5 * 1000, //5s
    maxDowntime: 10 * 1000, //10s
    serverName: 'App',
    alert: {
        telegram: {
            token: '',
            chatIds: [

            ],
        }
    },
    networks: [
        {
            name: 'Test1',
            localRPC: '',
            remoteRPC: '',
            diff: 0
        },
        {
            name: 'Test2',
            localRPC: '',
            remoteRPC: '',
            diff: 0,
            auth: {
                type: 'BASIC',
	            user: 'boris',
                password: 'fsdsd23fsda'
            }
        }
    ]
}
