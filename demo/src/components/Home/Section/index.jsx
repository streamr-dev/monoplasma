// @flow

import React, { type Node } from 'react'
import Headline from '../Headline'

type Props = {
    className?: string,
    title: string,
    children: Node,
}

const Section = ({ className, title, children }: Props) => (
    <div className={className}>
        <Headline>{title}</Headline>
        {children}
    </div>
)

export default Section
