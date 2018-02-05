import React, { Component } from 'react'

const canvasHandlers = {
    circle: (ctx, { fill, cx, cy, r }) => {
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.closePath()
        ctx.fill()
    },
    line: (ctx, { stroke, x1, x2, y1, y2 }) => {
        ctx.strokeStyle = stroke
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.closePath()
        ctx.stroke()
    },
}

export default class CanvasRenderer extends Component {
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
