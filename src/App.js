import React, { Component } from 'react'
import debounce from 'lodash/debounce'
import { BrowserRouter, Route, Link } from 'react-router-dom'
import { RemoteRoom } from './Room'
import CanvasSubscriber from './CanvasSubscriber'
import SizeWrapper from './SizeWrapper'

// const URL = 'http://crosby.cluster.recurse.com:3000'
const URL = 'http://localhost:3000'

class FiftyPoints extends Component {
    room = new RemoteRoom(URL)
    lastCount = 0
    componentDidMount () {
        window.addEventListener('click', this.onClick)
        this.mainSubscription = this.room.subscribe()
            .select('point at ($x, $y)')
            .addListener(({ doAll }) => {
                doAll((points) => {
                    if (points.length === this.lastCount) { return }
                    this.lastCount = points.length
                    // last 50 points
                    points = points.slice(-50)
                    // blank existing lines
                    // this.room.retract('shape $type with color $stroke from ($x1, $y1) to ($x2, $y2)')
                    // assert lines between every point
                    for (let i = 0; i < points.length; i++) {
                        const { x: x1, y: y1 } = points[i]
                        for (let j = i + 1; j < points.length; j++) {
                            const { x: x2, y: y2 } = points[j]
                            this.room.assert(`shape line with color green from (${x1}, ${y1}) to (${x2}, ${y2})`)
                        }
                    }
                })
            })
    }
    componentWillUnmount () {
        this.mainSubscription.unsubscribe()
        window.removeEventListener('click', this.onClick)
    }
    onClick = (e) => {
        this.room.assert(`point at (${e.clientX}, ${e.clientY})`)
    }
    render () {
        const { width, height } = this.props
        return (
            <CanvasSubscriber
                room={this.room}
                select="shape $type with color $stroke from ($x1, $y1) to ($x2, $y2)"
                width={width}
                height={height}
            />
        )
    }
}

const FiftyPointsPage = () => (
    <SizeWrapper>{({ width, height }) =>
        <FiftyPoints width={width} height={height} />
    }</SizeWrapper>
)

class Dots extends Component {
    lastTick = 0
    room = new RemoteRoom(URL)
    componentDidMount () {
        window.addEventListener('mousemove', this.onMouseMove, 100)
        window.addEventListener('click', this.onClick)
    }
    componentWillUnmount () {
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('click', this.onClick)
    }
    onMouseMove = debounce((e) => {
        this.room.assert(`cursor circle with color red and radius 10 at (${e.clientX}, ${e.clientY}) time ${++this.lastTick}`)
        this.room.retract(`cursor circle with color red and radius 10 at ($x, $y) time ${this.lastTick - 1}`)
    })
    onClick = (e) => {
        this.room.assert(`cursor circle with color red and radius 10 at (${e.clientX}, ${e.clientY}) time 50000`)
    }
    render () {
        const { width, height } = this.props
        return (
            <CanvasSubscriber
                room={this.room}
                select="cursor $type with color $fill and radius $r at ($cx, $cy) time $t"
                width={width}
                height={height}
            />
        )
    }
}

const DotsPage = () => (
    <SizeWrapper>{({ width, height }) =>
        <Dots width={width} height={height} />
    }</SizeWrapper>
)

class BouncingBall extends Component {
    lastTick = 0
    room = new RemoteRoom(URL)
    componentDidMount () {
        this.annoyingLoop()
    }
    componentWillUnmount () {
        window.cancelAnimationFrame(this.timeout)
    }
    annoyingLoop = () => {
        const x = Math.floor(Date.now() % 1000)
        const y = Math.abs(Math.floor(Date.now() % 300) - 150)
        const y2 = Math.abs(Math.floor(Date.now() % 400) - 150)
        this.room.assert(`shape circle with color red and radius 50 at (${x}, ${y + 200}) @ ${this.lastTick + 1}`)
        this.room.assert(`shape circle with color blue and radius 25 at (${x + 100}, ${y2 + 300}) @ ${this.lastTick + 1}`)
        this.room.retract(`shape circle with color $color and radius $r at ($x, $y) @ ${this.lastTick}`)
        this.lastTick++
        this.timeout = window.requestAnimationFrame(this.annoyingLoop)
    }
    render () {
        const { width, height } = this.props
        return (
            <CanvasSubscriber
                room={this.room}
                select="shape $type with color $fill and radius $r at ($cx, $cy) @ $time"
                width={width}
                height={height}
            />
        )
    }
}

const BouncingBallPage = () => (
    <SizeWrapper>{({ width, height }) =>
        <BouncingBall width={width} height={height} />
    }</SizeWrapper>
)

const Landing = () => (
    <div>
        <Link to="/dots">Dots</Link>
        <Link to="/bouncing">Bouncing Balls</Link>
        <Link to="/fifty-points">Fifty Points at Random</Link>
    </div>
)

const App = () => (
    <div>
        <Route path="/dots" component={DotsPage} />
        <Route path="/bouncing" component={BouncingBallPage} />
        <Route path="/fifty-points" component={FiftyPointsPage} />
        <Route exact path="/" component={Landing} />
    </div>
)

const Root = () => (
    <BrowserRouter>
        <App/>
    </BrowserRouter>
)

export default Root
