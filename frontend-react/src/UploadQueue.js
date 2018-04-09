import React from "react";
import _ from 'underscore';
// Import React Table
import ReactTable from "react-table";
import "react-table/react-table.css";
import filesize from 'filesize';
import moment from 'moment';
import Progress from 'react-progressbar';
import 'font-awesome/css/font-awesome.min.css';

const styles = {
  download : {
    cursor: 'pointer',
    color: '#000'
  },
  actionColumn : {
    textAlign: 'center'
  }
}

export default class UploadQueue extends React.Component {
 state = {
   files : []
 }
  handleDownloadFile = (identifier) => {
    return (e) => {
      e.preventDefault();
      console.log(identifier);
    }
  }

  componentDidMount(){
    this.refreshResumableFiles();
    this.fileTimer = setInterval(this.refreshResumableFiles, 100);
  }

  refreshResumableFiles = () => {
    const {files, resumable} = this.props;
    const stateFiles = _.map(files, (f, key) => {
      const resumableFile = _.find(resumable.files, rf => rf.uniqueIdentifier === f.uniqueIdentifier)
      const hidden = key > 0//resumable.isUploading() && !resumableFile.isUploading()
      f.progress = resumableFile? Math.round(resumableFile.progress() *100) : 0;
      
      if (resumableFile){
        if (resumableFile.isUploading()){
          f.actionButton = { action: 'pause', func: resumable.pause, hidden };
        }
        else {
          f.actionButton = { action: 'play', func: resumable.upload, hidden };
        }
      }
      return f;
    })
    this.setState({ files: stateFiles })
  }

  render() {
    const {files} = this.state;
    return (
      <div>
        <ReactTable
          data={files}
          noDataText="Drag files to this window to begin uploading."
          columns={[
            {
              Header: 'Upload Queue',
              columns: [
                {
                  //Cancel, pause buttons
                  id: 'actionButton',
                  accessor: 'actionButton',
                  maxWidth: 40,
                  Cell : (row) => <div style={styles.actionColumn}>
                    {!row.value.hidden && <i style={styles.download} className={`fa fa-${row.value.action}`} onClick={row.value.func}></i>}
                  </div>
                },
                {
                  Header: "Name",
                  accessor: "name",
                  id: 'name'
                },
                {
                  Header: "Size",
                  id : 'size',
                  accessor: (d) => filesize(d.size)
                },
                {
                  Header: "%",
                  id : 'progress',
                  maxWidth: 75,
                  accessor: 'progress',
                },
                {
                  Header: "Progress",
                  id : 'progress',
                  accessor: 'progress',
                  Cell : (row) => <Progress completed={row.value} />
                },
              ]
            },
          
          ]}
          defaultPageSize={10}
          showPagination={false}
          className="-striped -highlight"
        />
        <br />
      </div>
    );
  }
}
