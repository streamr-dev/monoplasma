// @flow

import React from 'react'
import Container from '../Container'

import styles from './hero.module.css'

const Hero = () => (
    <div className={styles.root}>
        <Container>
            <h1>Monoplasma Revenue Sharing Demo</h1>
            <p>This is a demonstration of how Monoplasma contracts can be used to implement basic ERC-20 token revenue sharing</p>
        </Container>
    </div>
)

export default Hero
