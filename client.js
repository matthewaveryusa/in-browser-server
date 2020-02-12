const WS = require('ws');

const ws = new WS('wss://proxy7-server.averymatt.com')


ws.on('open', () => {
	console.log('opened')
})

ws.on('message', (message) => {
	message = JSON.parse(message)
	console.log('message', message)
	if(message.action === 'authenticate') {
		const response = {
                    action: 'authenticate',
		    username: 'matt',
		    key: Buffer('hi').toString('base64'),
		    nonce: message.nonce,
		    host : 'proxy7.averymatt.com'
	    }
	    ws.send(JSON.stringify(response))
	}
        if(message.end) {
		ws.send(JSON.stringify({
                        reqId: message.reqId,
			header: {
				code: 200, 
				status: 'OK',
				headers: []
			},
			body: '<html>hello world!</html>',
                        encoding: 'utf8',
			end: true
		}
		))
        }

})
