import React, { Component } from 'react'
import { match } from './util'

const shapeHandlers = {
    circle: (props) => (<circle {...props} />),
    rect: (props) => (<rect {...props} />),

}

export default class SVGRenderer extends Component {
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
