import React, { Component } from 'react'
import styled from 'styled-components'
import Room from './Room'

const match = (getKey, map, getDefault = () => null) => (value) => {
    const key = getKey(value)
    return map[key] ? map[key](value) : getDefault(value, key)
}

const shapeHandlers = {
    circle: (props) => (<circle {...props} />),
    rect: (props) => (<rect {...props} />),

}

const canvasHandlers = {
    circle: (ctx, { fill, cx, cy, r }) => {
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    },

}

class Canvas extends Component {
    componentDidMount () {
        const { width, height } = this.props
        this._ref.width = width
        this._ref.height = height
        this.ctx = this._ref.getContext('2d')
        this.updateCanvas()
    }
    updateCanvas = () => {
        const { width, height, figures } = this.props
        this.ctx.fillStyle = '#000'
        this.ctx.fillRect(0, 0, width, height)
        figures.forEach((figure) => {
            if (canvasHandlers[figure.type]) {
                canvasHandlers[figure.type](this.ctx, figure)
            }
        })
        window.requestAnimationFrame(this.updateCanvas)
    }
    componentWillReceiveProps ({ width, height }) {
        if (width !== this.props.width || height !== this.props.height) {
            this._ref.width = width
            this._ref.height = height
        }
    }
    shouldComponentUpdate () {
        return false
    }
    setRef = (el) => { this._ref = el }
    render () {
        return <canvas ref={this.setRef} />
    }
}

class SVGScreen extends Component {
    render () {
        const { width, height, figures } = this.props
        return (
            <svg width={width} height={height}>
                {figures.map((figure) => (
                    <g key={figure._id}>
                        {match((shape) => shape.type, shapeHandlers)(figure)}
                    </g>
                ))}
            </svg>
        )
    }
}

const Container = styled.div`
`

const MainContent = styled.div`
`

const Sidebar = styled.div`
    position: absolute;
    width: 300px;
    top: 0;
    right: 0;
`
const Field = styled.div`
    label {
        display: block;
    }
    textarea {
        width: 100%;
        height: 5em;
    }
`

const JSONDump = styled.pre`
    font-family: monospace;
`

const ConnectionStatus = styled(({ connected, ...props }) => connected ? null : (
    <div {...props}
        onClick={() => { window.location.reload() }}>
        Connection offline
    </div>
))`
    background-color: red;
    color: white;
    position: absolute;
    width: 100%;
    top: 0;
    left: 0;
    text-align: center;
    font-size: 32px;
    padding: 2em;
`

const unstr = (x) => x && x.str ? x.str : x

const mapValues = (obj, fn) =>
    Object.entries(obj).reduce((m, [k, v]) => Object.assign(m, { [k]: fn(v, k) }), {})

const addIDs = (value, i) => ({
    ...value,
    _id: i,
    ...mapValues(value, unstr),
})

const APP_STATE = '@modernserf/rumor-visualizer/v2'

class App extends Component {
    constructor () {
        super()
        this.state = {
            figures: [],
            assertion: '',
            query: 'shape $type with color $fill and radius $r at ($cx, $cy)',
            connected: true,
            timeout: 1000,
            width: 500,
            height: 500,
            sidebar: { 'top': 0, 'right': 0 },
        }

        if (window.localStorage.getItem(APP_STATE)) {
            Object.assign(this.state, JSON.parse(window.localStorage.getItem(APP_STATE)))
        }
    }
    componentDidMount () {
        this.room = new Room(process.env.REACT_APP_ROOM_URL)
        this.updateSlowData()
        this.updateFigures()
        this.annoyingLoop()
    }
    componentWillUnmount () {
        clearTimeout(this.timeout)
    }
    getSavedState () {
        const { assertion, query } = this.state
        return { assertion, query }
    }
    annoyingLoop = () => {
        const x = Math.floor(Date.now() % 1000)
        const y = Math.abs(Math.floor(Date.now() % 300) - 150)
        const y2 = Math.abs(Math.floor(Date.now() % 400) - 150)
        this.room.retract('shape circle with color $color and radius $r at ($x, $y)')
        this.room.assert(`shape circle with color red and radius 50 at (${x}, ${y + 200})`)
        this.room.assert(`shape circle with color blue and radius 25 at (${x + 100}, ${y2 + 300})`)
        window.setTimeout(this.annoyingLoop, 50)
    }
    async fetchFacts () {
        return this.room.facts()._db().then((facts) => console.log(facts) || facts)
    }
    async fetchAll () {
        const queries = this.state.query.split('\n')
        const solutionGroups = await Promise.all(queries.map((query) =>
            this.room.select(query)._db().then(({ solutions }) => solutions)))

        return solutionGroups.reduce((allSolutions, solnsForQuery) =>
            allSolutions.concat(solnsForQuery), [])
    }
    updateSlowData = () => {
        window.localStorage.setItem(APP_STATE, JSON.stringify(this.getSavedState()))

        this.room.select('the whiteboard is $width by $height').do(({ width, height }) => {
            this.setState({ width, height })
        })
        this.room.select('the sidebar is at $yval $ypos $xval $xpos').do(({ yval, ypos, xval, xpos }) => {
            this.setState({
                sidebar: { [yval.str]: ypos, [xval.str]: xpos },
                connected: true,
                timeout: 5000,
            })
        }).catch(() => {
            this.setState({ connected: false, timeout: this.state.timeout * 2 })
        })
        this.timeout = setTimeout(this.updateSlowData, this.state.timeout)
    }
    updateFigures = () => {
        this.fetchAll().then((matches) => {
            this.setState({ figures: matches.map(addIDs) })
            window.requestAnimationFrame(this.updateFigures)
        })
    }
    getAssertions () {
        return this.state.assertion.split('\n')
    }
    onAssert = () => {
        this.getAssertions().map(x => this.room.assert(x))
    }
    onRetract = () => {
        this.getAssertions().map(x => this.room.retract(x))
    }
    render () {
        const { figures, connected, width, height, sidebar } = this.state
        return (
            <Container>
                <ConnectionStatus connected={connected} />
                <MainContent>
                    <Canvas width={width} height={height} figures={figures}/>
                </MainContent>
                <Sidebar style={sidebar}>
                    <Field>
                        <label>Queries</label>
                        <textarea
                            value={this.state.query}
                            onChange={(e) => this.setState({ query: e.target.value })}
                        />
                    </Field>
                    <Field>
                        <label>Assert / Retract</label>
                        <textarea
                            value={this.state.assertion}
                            onChange={(e) => this.setState({ assertion: e.target.value })}
                        />
                        <button onClick={this.onAssert}>Assert</button>
                        <button onClick={this.onRetract}>Retract</button>
                    </Field>
                    <Field>
                        <label>Data</label>
                        <JSONDump>{JSON.stringify(figures, null, 2)}</JSONDump>
                    </Field>
                </Sidebar>
            </Container>
        )
    }
}

export default App
