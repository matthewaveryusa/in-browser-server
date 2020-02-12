const WS = require('ws');
const crypto = require('crypto')
const http = require('http')
const mysql = require('mysql')

//todo email, sms, filestorage, ldap/identity, redis

async function random_bytes(len) {
	return new Promise((accept,reject) => {
		crypto.randomBytes(len, (err,buf) => {
			if(err) return reject(buf)
		        accept(buf.toString('base64'))
		})
	})
}

const httpwss = http.createServer()
httpwss.on('upgrade', function upgrade(request, socket, head) {
    console.log('httpwss upgrade')
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
});

httpwss.on('request', (req,res) => {
console.log('httpwss request', req.url)
if(req.url === '/') {
res.end(
`<!DOCTYPE html>
<html>
<body>
<textarea id=content rows="20" cols="50">
&lt;html&gt;Hello world&lt;/html&gt;
</textarea>
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
    <script src="./frontend.js"></script>
  </body>
</html>`)
} else {
res.end(
`$(function () {
  "use strict";
  var content = $('#content');
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  var connection = new WebSocket('wss://proxy-server.averymatt.com');
  connection.onopen = function () {
    console.log('opened')
  };
  connection.onerror = function (error) {
    console.log('error', error)
  };
  connection.onmessage = function (message) {
    try {
      message = JSON.parse(message.data);
    } catch (e) {
      console.log('Invalid JSON: ', message.data);
      return;
    }
	console.log('message', message)
	if(message.action === 'authenticate') {
		const response = {
                    action: 'authenticate',
		    username: 'matt',
		    key: 'oops',
		    nonce: message.nonce,
		    host : 'proxy7.averymatt.com'
	    }
	    connection.send(JSON.stringify(response))
	}
        if(message.end) {
		connection.send(JSON.stringify({
                        reqId: message.reqId,
			header: {
				code: 200, 
				status: 'OK',
				headers: []
			},
			body: content.val(),
                        encoding: 'utf8',
			end: true
		}
		))
        }

  };
});`)
	}
})

httpwss.listen(8080)

const wss = new WS.Server({noServer: true});
const hosts = {}
const reqIds = {}

wss.on('connection', async function connection(ws) {
	nonce = await random_bytes(32)
	o2p = new OriginToProxy(ws, nonce)
})

const server = http.createServer(async (req, res) => {
	if(req.headers.host in hosts) {
          console.log('origin up', req.headers.host)
          origin = hosts[req.headers.host]
          const reqId = await random_bytes(32);
	  await origin.send(req, res, reqId)
	} else {
          console.log('origin offline')
	  res.writeHead(500, 'Origin Offline')
	  res.end()
	}
})

server.listen(8081)



class OriginToProxy {
	constructor(ws, nonce) {
		this.authenticator = null
		this.nonce = nonce
		this.ws = ws
                this.dbConnection = null

	        ws.on('message', (message) => this.on_message(message))
	        ws.on('close', (code, reason) => this.on_close())
	        ws.on('error', (err) => this.on_error())
	        ws.on('ping', (data) => this.on_ping())
	        ws.on('pong', (data) => this.on_pong())
	        ws.on('unexpected-response', (err) => this.on_error())
		ws.send(JSON.stringify({action:'authenticate', nonce: nonce}))
	}

	send(req, res, reqId) {
		reqIds[reqId] = {req: req, res: res, reqId: reqId}

		this.ws.send(JSON.stringify({reqId: reqId, headers: req.headers, httpVersion: req.httpVersion, method: req.method, url: req.url }))
		req.on('data', (data) => {
		  this.ws.send(JSON.stringify({reqId: reqId, body: body.toString('base64'), end: false }))
		})
		req.on('end', () => {
		  this.ws.send(JSON.stringify({reqId: reqId, end: true }))
		})
		req.on('error', (err) => {
		  this.ws.send(JSON.stringify({reqId: reqId, end: true, error: err }))
		})
	}

	on_message(message) {
          message = JSON.parse(message)
          console.log(message)
          if(message.action === 'authenticate') {
	    if(this.nonce !== message.nonce) {
		    //TODO disconnect user
	    }
            this.authenticator = {
		    username: message.username,
		    key: message.key,
		    nonce: message.nonce,
		    host : message.host
	    }
            userDbConnection.query('select username, key, salt, host from users left join hosts on users.username = hosts.username where users.username = ? and hosts.host = ?', [message.username, message.host], (error, results, fields) => {
              console.log(error, results, fields)
	      hosts[this.authenticator.host] = this
	    })
	  }

          if(!this.authenticator) {
		  console.log('closing connection, no authenticator')
		  this.ws.close()
		  return
	  }

	  if(message.reqId) {
		 let reqId = reqIds[message.reqId] 
		 if(reqId) {
			 if(message.header) {
			   reqId.res.writeHead(message.header.code, message.header.status, message.header.headers)
			 }
			 if(message.body) {
                           if(message.encoding === 'utf8') {
                             reqId.res.write(message.body)
                           } else {
                             reqId.res.write(Buffer.from(message.body, 'base64'))
			   }
			 }
			 if(message.end) {
                           console.log('ending')
			   reqId.res.end()
			 }
		 }
	  }

         if(message.query) {
           const cb = (error, results,fields) => {
             console.log(errpr, results, fields);
           }
           if(message.values) {
             this.dbConnection.query(message.query, message.values, cb)
           } else {
             this.dbConnection.query(message.query, cb)
           }
         }
	}

	on_close(code, reason) {
          console.log('close', code, reason)
	  if(this.authenticator) {
		  delete hosts[this.authenticator.subdomain]
	  }
	}

	on_error(err) {
		console.log('error', err);
	}

	on_ping(data) {
	}

	on_pong(data) {
	}

	on_process_error(err) {
		console.log('process error', err);
	}
}
