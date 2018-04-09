import React, { Component } from 'react';
import DataPump from './DataPump.js';

const styles = {
  appContainer : {
    // display: 'flex',
    padding: '5px 15px'
  }
}

class App extends Component {
  render() {
    return (
      <div style={styles.appContainer}>
        <DataPump />
      </div>
    );
  }
}

export default App;
