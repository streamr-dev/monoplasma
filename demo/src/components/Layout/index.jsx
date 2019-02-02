// @flow

import React, { type Node } from 'react'

import 'normalize.css'
import '../../stylesheets/variables.css'
import './layout.css'

type Props = {
    children: Node,
}

const Layout = ({ children }: Props) => (
    <div>
        {children}
    </div>
)

export default Layout
