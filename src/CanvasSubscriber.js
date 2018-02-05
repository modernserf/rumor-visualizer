import React, { Component } from 'react'
import Canvas from './CanvasRenderer'

const unstr = (x) => x && x.str ? x.str : x

const mapValues = (obj, fn) =>
    Object.entries(obj).reduce((m, [k, v]) => Object.assign(m, { [k]: fn(v, k) }), {})

const addIDs = (value, i) => ({
    ...value,
    _id: i,
    ...mapValues(value, unstr),
})

export default class CanvasSubscriber extends Component {
    state = {
        figures: [],
    }
    lastTick = 0
    componentDidMount () {
        const { room, select } = this.props
        room.retract(select)

        this.mainSubscription = room.subscribe()
            .addListener((selector) => selector.doAll((solutions) => {
                this.setState({ figures: solutions.map(addIDs) })
            }))
            .select(select)
    }
    componentWillUnmount () {
        this.mainSubscription.unsubscribe()
    }
    render () {
        const { width, height } = this.props
        const { figures } = this.state
        return (
            <Canvas width={width} height={height} figures={figures}/>
        )
    }
}
