import React, { Component } from 'react'

export default class SizeWrapper extends Component {
    state = {
        width: 500,
        height: 500,
    }
    componentDidMount () {
        this.onResize = () => this.setState({ width: window.innerWidth, height: window.innerHeight })
        window.addEventListener('resize', this.onResize)
        this.onResize()
    }
    componentWillUnmount () {
        window.removeEventListener('resize', this.onResize)
    }
    render () {
        const { width, height } = this.state
        const { children, ...props } = this.props
        return (
            <div {...props}>{this.props.children({ width, height })}</div>
        )
    }
}
