import RoomDB from 'roomdb'
import socketIO from 'socket.io-client'

// TODO: make this async to match remote API?
// Or just expect consumer to use await / Promise.resolve
// if they're using them interchangeably?
export class LocalRoom {
    constructor () {
        this._client = new RoomDB().connect()
        this._subscriptions = []
    }
    facts () {
        return this._client.facts
    }
    assert (fact) {
        this._client.assert(fact)
        this._updateSubscriptions()
    }
    retract (fact) {
        this._client.retract(fact)
        this._updateSubscriptions()
    }
    select (...queries) {
        return this._client.select(...queries)
    }
    subscribe () {
        const sub = { queries: [], listeners: [] }
        this._subscriptions.push(sub)
        const index = this._subscriptions.length
        const handler = {
            select: (...qs) => {
                sub.queries = qs
                this._updateSubscriptions()
                return handler
            },
            addListener: (cb) => {
                sub.listeners.push(cb)
                this._updateSubscriptions()
                return handler
            },
            unsubscribe: () => {
                this._subscriptions.splice(index, 1)
                return null
            },
        }
        return handler
    }
    _updateSubscriptions () {
        this._subscriptions.forEach(({ queries, listeners }) => {
            listeners.forEach((onChange) => onChange(this.select(...queries)))
        })
    }
}

export class RemoteRoom {
    constructor (uri, id) {
        this.uri = uri
        this.id = id
        this.rootSocket = socketIO(this.uri)
    }
    facts () {
        return this._postHTTP('facts')
    }
    assert (fact) {
        this.rootSocket.emit('assert', [fact])
    }
    retract (fact) {
        this.rootSocket.emit('retract', [fact])
    }
    select (...queries) {
        const req = this._postHTTP('select', { facts: queries })

        req.do = (next) => {
            req.then(({ solutions }) => solutions.forEach(next))
            return req
        }
        req.doAll = (next) => {
            req.then(({ solutions }) => next(solutions))
            return req
        }

        return req
    }
    subscribe () {
        const socket = socketIO(this.uri)
        const handler = {
            select: (...qs) => {
                socket.emit('updateSubscription', qs)
                return handler
            },
            addListener: (next) => {
                socket.on('subscriptionFacts', (solutions) => {
                    next({
                        do: (cb) => solutions.forEach(cb),
                        doAll: (cb) => cb(solutions),
                    })
                })
                return handler
            },
            unsubscribe: () => {
                socket.disconnect()
                return null
            },
        }
        return handler
    }
    async _postHTTP (endpoint, data = {}) {
        const uri = `${this.uri}/${endpoint}`

        const post = {
            method: 'POST',
            body: JSON.stringify({ id: this.id, ...data }),
            headers: { 'Content-Type': 'application/json' },
        }

        const res = await window.fetch(uri, post)
        const json = await res.json()
        this.id = this.id || json.id
        return json
    }
}
