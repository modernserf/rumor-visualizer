import React, { Component } from 'react'
import styled from 'styled-components'
import debounce from 'lodash/debounce'
import { LocalRoom } from './Room'
import Canvas from './CanvasRenderer'

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
    }
    componentDidMount () {
        this.room = new LocalRoom()
        this.initSubscriptions()
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
    initSubscriptions = () => {
        this.room.subscribe()
            .select('the whiteboard is $width by $height')
            .addListener((selector) => selector.do(({ width, height }) => {
                this.setState({ width, height })
            }))

        this.room.subscribe()
            .select('the sidebar is at $yval $ypos $xval $xpos')
            .addListener((selector) => selector.do(({ yval, ypos, xval, xpos }) => {
                this.setState({
                    sidebar: { [yval.str]: ypos, [xval.str]: xpos },
                    connected: true,
                    timeout: 5000,
                })
            }))

        this.mainSubscription = this.room.subscribe()
            .addListener((selector) => selector.doAll((solutions) => {
                this.setState({ figures: solutions.map(addIDs) })
            }))
        this.updateMainQuery(this.state.query)
    }
    getAssertions () {
        return this.state.assertion.split('\n')
    }
    updateMainQuery = debounce((query) => {
        this.mainSubscription.select(...query.split('\n').filter((x) => x.trim()))
    }, 3000)
    onSetMainQuery = (query) => {
        this.setState({ query })
        this.updateMainQuery(query)
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
                            onChange={(e) => this.onSetMainQuery(e.target.value)}
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
