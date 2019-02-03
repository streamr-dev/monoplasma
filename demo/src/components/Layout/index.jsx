// @flow

import React, { type Node, Fragment } from 'react'
import Helmet from 'react-helmet'

import 'normalize.css'
import '../../stylesheets/variables.css'
import './layout.css'

type Props = {
    children: Node,
}

const Layout = ({ children }: Props) => (
    <Fragment>
        <Helmet>
            <meta httpEquiv="content-type" content="text/html; charset=utf-8" />
            <meta name="description" content="See https://github.com/streamr-dev/monoplasma" />
            <meta name="keywords" content="monoplasma revenue sharing ethereum token sidechain demo" />
            <title>Revenue sharing demo</title>
        </Helmet>
        {children}
    </Fragment>
)

export default Layout
