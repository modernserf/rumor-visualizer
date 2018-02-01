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
    }
    facts () {
        return this._postHTTP('facts')
    }
    assert (fact) {
        return this._postHTTP('assert', { fact })
    }
    retract (fact) {
        return this._postHTTP('retract', { fact })
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
        return {
            select: (...qs) => {
                socket.emit('select', qs)
            },
            addListener: (cb) => {
                socket.on('solutions', cb)
            },
            unsubscribe: () => {
                socket.disconnect()
            },
        }
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

export default class Room {
    constructor (uri) {
        this.uri = uri
        this.id = null
        this._data = null
        this._endpoint = null
    }

    _db () {
        if (!(this._data || this._endpoint)) {
            throw new Error(`please set _data and _endpoint using assert(), retract(), select(), or do()`)
        }
        const endpoint = this.uri + '/' + this._endpoint

        const post = {
            method: 'POST',
            body: JSON.stringify(Object.assign(this._data, { id: this.id })),
            headers: { 'Content-Type': 'application/json' },
        }

        return window.fetch(endpoint, post)
            .then(response => response.json())
            .then(json => {
                this.id = this.id || json.id
                this._data = null
                this._endpoint = null
                return json
            }).catch((err) => {
                console.error(err)
            })
    }

    facts () {
        this._endpoint = 'facts'
        return this
    }

    select (...facts) {
        this._data = { facts }
        this._endpoint = 'select'
        return this
    }

    async do (callbackFn) {
        const { solutions } = await this._db()
        solutions.forEach(callbackFn)
    }

    async doAll (callbackFn) {
        const { solutions } = await this._db()
        callbackFn(solutions)
    }

    // todo: implement filler values
    assert (fact, _) {
        this._data = { fact }
        this._endpoint = 'assert'
        this._db()
        return this
    }

    // todo: implement filler values
    retract (fact, _) {
        this._data = { fact }
        this._endpoint = 'retract'
        this._db()
        return this
    }
}
