# node-monitoring
The project is designed to monitor the node.

Sends a telegram notification when the difference between the last block and the reference node is more than n blocks. 

# configure 
Need to configure src/config.js <br/>
**Telegram** <br/>
token - bot token  <br/>
chatIds - array of chat to send notification <br/>
**Networks** <br/>
localRPC - node RPC for monitoring <br/>
remoteRPC - node RPC which is compared last block <br/>
diff - max block diff, if exceed will send notification

# START
npm i <br/>
npm start
