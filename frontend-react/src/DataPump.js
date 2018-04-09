import React from 'react';
import Dropzone from 'react-dropzone';
import Resumable from 'resumablejs';
import _ from 'underscore';
import axios from 'axios';
import constants from './config';
import FileHistory from './FileHistory';
import UploadQueue from './UploadQueue';

const HISTORY_POLL_TIME_MS = 5000;
const PROGRESS_POLL_TIME = 800;
axios.defaults.baseURL = constants.API_URL;
const uploadEndpoint = `${constants.API_URL}/api/upload`;
const simultaneousUploads = 3;

export default class DataPump extends React.Component {

  state = {
    files: [],
    historyFiles: [],
    dropzoneActive: false,
    focusedFile: null,
    noNetwork: false,
    recentSuccess: false,
    less: true,
    modalOpen: false
  }

  componentDidMount() {
    this.initializeResumable();
    this.getFileHistory();

    this.pollTimer = setInterval(this.getFileHistory, HISTORY_POLL_TIME_MS);
    // this.progressTimer = setInterval(this.progressPoller, PROGRESS_POLL_TIME)
  }

  componentWillUnmount() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    if (this.resumable) this.resumable.pause();
  }

  getFileHistory = () => {
    const errCb = (err) => {
      this.setState({ noNetwork: true })
    }

    const successCb = (resp) => {
      if (resp.data) {
        this.setState({ historyFiles: resp.data, noNetwork: false })
      }
    }
    DataPumpAPI.postUploadHistory({}, successCb);
  }

  progressPoller = () => {
    const fileInUpload = _.find(this.resumable.files, file => file.isUploading());
    if (!fileInUpload) return;
    const progress = Math.round(fileInUpload.progress(false) * 100);
    this.setState({ progress })
  }

  initializeResumable = () => {
    this.resumable = new Resumable({
      target: uploadEndpoint,
      simultaneousUploads,
      chunkSize: 1 * 1024 * 1024,
      // headers: { Authorization: Auth.getToken() },
      generateUniqueIdentifier: function (file, event) {
        var relativePath = file.webkitRelativePath || file.fileName || file.name; // Some confusion in different versions of Firefox
        var size = file.size;
        return (relativePath.replace(/[^0-9a-zA-Z_-]/img, '') + '-' + size);
      }
    });


    if (!this.resumable.support) alert('Your browser does not support the upload feature, please contact the administrator');

    this.resumable.on('cancel', function () {
      console.log('cancel');
    });

    this.resumable.on('fileAdded', (file, event) => {
      const { fileName, size, uniqueIdentifier } = file;
      // this.newEdlRecord({
      //   fileSize: size,
      //   identifier: uniqueIdentifier,
      //   filename: fileName,
      // })
      this.setState({ modalOpen: true })
      this.resumable.upload()

    });

    this.resumable.on('error', function (e) {
      console.log('ERROR')
    })

    this.resumable.on('fileSuccess', (file) => {
      const { size, name } = file.file;
      const { files } = this.state;
      const newFiles = _.filter(files, f => !(f.size === size && f.name === name));
      this.resumable.files = _.filter(this.resumable.files, f => !(f.size === size && f.fileName === name));
      this.setState({ files: newFiles, recentSuccess: true })
      /** Do something? or just rely on our in-house logs */
      /** Clear speed timer */
    });
  }

  onDragEnter = () => {
    this.setState({
      dropzoneActive: true
    });
  }

  onDragLeave = () => {
    this.setState({
      dropzoneActive: false
    });
  }

  onDrop = (files) => {

    const allFiles = this.state.files;
    const { historyFiles } = this.state;
    const orderedFiles = _.sortBy(files, file => file.size)
    _.each(orderedFiles, file => {
      const { size, name } = file;
      const exists = _.find(allFiles, f => f.size === size && f.name === name);
      if (!exists) {
        allFiles.push(file);
        this.resumable.addFile(file);
      }
    })

    this.setState({ files: allFiles, dropzoneActive: false, });


  }

  render() {
    const {historyFiles, files, dropzoneActive} = this.state;
    let dropzoneRef;

    return <div>
        <Dropzone disableClick
          ref={(node) => { dropzoneRef = node; }}
          onDrop={this.onDrop} 
          onDragEnter={this.onDragEnter}
          onDragLeave={this.onDragLeave} 
          style={styles.dropzone}
          >
          <div>
            {/* <div style={styles.dropbox} onClick={() => dropzoneRef.open() }>Drag files to this window to begin uploading or <span style={styles.underline}>choose files.</span></div> */}
              { dropzoneActive && <div style={styles.overlayStyle}>Drop files...</div> }
              <div><UploadQueue resumable={this.resumable} files={files}/></div>
              <div><FileHistory files={historyFiles}/></div>
          </div>
        </Dropzone>
        
      </div>
  }
}

// app.post('/api/upload', ensureAuthenticated, DataPumpHttp.postUploadChunk);
// app.get('/api/upload', ensureAuthenticated, DataPumpHttp.getUploadChunk);

// app.post('/api/new', ensureAuthenticated, DataPumpHttp.postNewUploadRecord)
// app.get('/api/log/:id', ensureAuthenticated, DataPumpHttp.getLogByIdentifier)
// app.get('/api/download/:identifier', ensureAuthenticated, DataPumpHttp.getDownloadByIdentifier);
// app.post('/api/history', ensureAuthenticated, DataPumpHttp.postUploadHistory)
class DataPumpAPI {
  static postNewUploadRecord(){

  }

  static getLogByIdentifier(){

  }

  static getDownloadByIdentifier(){

  }

  static postUploadHistory(data, callback){
    axios.post('/api/history').then(callback).catch(err => console.error(err))
  }


}

const styles = {
  dropzone : {},
  dropbox : {
    border: `2px dashed black`,
    padding: 15,
    cursor: 'pointer',
    marginBottom: 15
  },
  underline : {
    textDecoration: 'underline'
  },
  overlayStyle : {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: '2.5em 0',
    background: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    color: '#fff',
    fontSize: 100,
    zIndex: 9001
  }
}