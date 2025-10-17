import { io, Socket } from 'socket.io-client'
// Singleton socket with safe connect/disconnect helpers
class SocketClient {
private _socket: Socket | null = null
get socket(): Socket {
if (!this._socket) {
const url = process.env.NEXT_PUBLIC_SERVER_URL
if (!url) throw new Error('NEXT_PUBLIC_SERVER_URL is not set')
this._socket = io(url, {
autoConnect: false,
transports: ['websocket'],
reconnection: true,
reconnectionAttempts: 10,
reconnectionDelay: 500,
timeout: 8000,
})
}
return this._socket
}
connect() {
const s = this.socket
if (!s.connected) s.connect()
return s
}
disconnect() {
this._socket?.disconnect()
}
}
export const socketClient = new SocketClient()