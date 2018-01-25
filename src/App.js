import React, { Component } from 'react'
import styled from 'styled-components'
import Room from './Room'

const match = (getKey, map, getDefault) => (value) => {
    const key = getKey(value)
    return map[key] ? map[key](value) : getDefault(value, key)
}

const shapeHandlers = {
    circle: (props) => (<circle key={props._id} {...props} fill={props.fill.str} />),
    cat: ({ x, y, name }) => (
        <g transform={`translate(${x}, ${y})`}>
            <text fill="white">{name.str}</text>
        </g>
    ),
}

const DefaultHandler = (props) => (
    <g>
        <text fill="white">{JSON.stringify(props)}</text>
    </g>
)

class Screen extends Component {
    render () {
        const { width, height, figures } = this.props
        return (
            <svg width={width} height={height}>
                {figures.map(match((shape) => shape.type, shapeHandlers, DefaultHandler))}
            </svg>
        )
    }
}

const Container = styled.div`
    display: flex;
    flex-direction: row;
`

const MainContent = styled.div`
    flex: 3 1 auto;
`

const Sidebar = styled.div`
    flex: 1 0 auto;
`
const Field = styled.div`
    label {
        display: block;
    }
    textarea {
        width: 100%;
        height: 3em;
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

const addIDs = (match, i) => ({ ...match, type: match.type.str, _id: i })

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
        }

        if (window.localStorage.getItem(APP_STATE)) {
            Object.assign(this.state, JSON.parse(window.localStorage.getItem(APP_STATE)))
        }
    }
    componentDidMount () {
        this.room = new Room('http://10.0.19.240:3000')
        this.updateFigures()
    }
    componentWillUnmount () {
        clearTimeout(this.timeout)
    }
    getSavedState () {
        const { assertion, query } = this.state
        return { assertion, query }
    }
    updateFigures = () => {
        window.localStorage.setItem(APP_STATE, JSON.stringify(this.getSavedState()))
        this.room
            .select(this.state.query)
            .doAll((matches) => this.setState({ figures: matches.map(addIDs) }))
            .then(() => {
                this.timeout = setTimeout(this.updateFigures, this.state.timeout)
                this.setState({ connected: true, timeout: 1000 })
            }, () => {
                this.setState({ connected: false, timeout: this.state.timeout * 2 })
            })
    }
    onAssert = () => {
        this.room.assert(this.state.assertion)
    }
    onRetract = () => {
        this.room.retract(this.state.assertion)
    }
    render () {
        const { figures, connected } = this.state
        return (
            <Container>
                <ConnectionStatus connected={connected} />
                <MainContent>
                    <Screen width={500} height={500} figures={figures}/>
                </MainContent>
                <Sidebar>
                    <Field>
                        <label>Query</label>
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
