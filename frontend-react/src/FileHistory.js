import React from "react";
import _ from 'underscore';
// Import React Table
import ReactTable from "react-table";
import "react-table/react-table.css";
import filesize from 'filesize';
import moment from 'moment';
import 'font-awesome/css/font-awesome.min.css';

const styles = {
  download : {
    cursor: 'pointer',
    color: '#4FC3F7'
  },
  actionColumn : {
    textAlign: 'center'
  }
}

export default class HistoryTable extends React.Component {
  // const {
  //   createdAt,
  //   fileSize,
  //   filename,
  //   identifier,
  //   statuses
  // } = file;
  state = {
    files : []
  }
  
  shouldComponentUpdate(){
    const fileStr = JSON.stringify(this.props.files);
    const stateStr = JSON.stringify(this.state.files);
    return (fileStr !== stateStr || this.state.files === 0)
  }

  componentDidUpdate(){
    const fileStr = JSON.stringify(this.props.files);
    const stateStr = JSON.stringify(this.state.files);
    if (fileStr !== stateStr || this.state.files === 0){
      this.setState({ files: JSON.parse(fileStr) })
    }
  }

  handleDownloadFile = (downloadKey) => {
    return (e) => {
      const {download} = this.props;
      e.preventDefault();
      if (download) download(downloadKey);
    }
  }

  render() {
    const {files} = this.state;
    return (
      <div>
        <ReactTable
          data={files}
          columns={[
            {
              Header: 'Upload History',
              columns: [
                {
                  id: 'downloadKey',
                  filterable: false,
                  accessor: (d) => d.children.length === 0? null : d.downloadKey,
                  maxWidth: 40,
                  Cell : (row) => <div style={styles.actionColumn}>
                    {row.value? <i style={styles.download} className="fa fa-download" onClick={this.handleDownloadFile(row.value)}></i> : <i className="fa fa-cog fa-spin fa-fw"></i>}                    
                  </div>
                },
                {
                  Header: "Name",
                  accessor: "filename",
                  id: 'filename'
                },
                {
                  Header: "Size",
                  id : 'fileSize',
                  Cell : (row) => <div>{filesize(row.value)}</div>,
                  accessor: (d) => d.fileSize,
                },
                {
                  Header: 'Type',
                  id: 'filetype',
                  accessor: (d) => {
                    const splits = d.filename.split('.');
                    return splits[splits.length - 1].toUpperCase()
                  }
                },
                {
                  Header: "Files",
                  id : 'files',
                  Cell : (row) => <div>{row.value <= 0 ? <i className="fa fa-spinner fa-spin fa-fw"></i> : row.value}</div>,
                  accessor: (d) => (d.children.length - 2),
                },
                {
                  Header: 'Created',
                  id: 'createdAt',
                  accessor: (d) => moment(d.createdAt).format('YYYY-MM-DD hh:mm')
                },
              ]
            },
          
          ]}
          defaultPageSize={6}
          filterable
          showPagination={true}
          className="-striped -highlight"
          SubComponent={row => {
            const data = row.original.children;
            const noData = data.length === 0;
            const pageSize = 10;
            const actualPageSize = data.length < pageSize? data.length : pageSize;
            const showPagination= data.length > pageSize;
            return (
              <div style={{ padding: "20px", paddingLeft: '34px' }}>
                {
                  noData ? <p>This upload is still processing.</p>: <ReactTable
                  filterable
                  data={row.original.children}
                  columns={[
                    {
                      id: 'downloadKey',
                      filterable: false,
                      accessor: 'downloadKey',
                      maxWidth: 40,
                      Cell : (row) => <div style={styles.actionColumn}>
                        <i style={styles.download} className="fa fa-download" onClick={this.handleDownloadFile(row.value)}></i>
                      </div>
                    },
                    {
                      Header: "Name",
                      accessor: "filename",
                      id: 'filename'
                    },
                    {
                      Header: "Size",
                      id : 'fileSize',
                      Cell : (row) => <div>{filesize(row.value)}</div>,
                      accessor: (d) => d.fileSize,
                    },
                    {filterable: false,},{filterable: false,},
                  ]}
                  defaultPageSize={actualPageSize}
                  showPagination={showPagination}
                />
                }
                
              </div>

            );
          }}
        />
        <br />
      </div>
    );
  }
}
