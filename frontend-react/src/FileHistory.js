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
  handleDownloadFile = (identifier) => {
    return (e) => {
      e.preventDefault();
      console.log(identifier);
    }
  }

  render() {
    
    return (
      <div>
        <ReactTable
          data={this.props.files}
          columns={[
            {
              Header: 'Upload History',
              columns: [
                {
                  id: 'identifier',
                  accessor: 'identifier',
                  maxWidth: 100,
                  Cell : (row) => <div style={styles.actionColumn}><i style={styles.download} className="fa fa-download" onClick={this.handleDownloadFile(row.value)}></i></div>
                },
                {
                  Header: "Name",
                  accessor: "filename",
                  id: 'filename'
                },
                {
                  Header: "Size",
                  id : 'fileSize',
                  accessor: (d) => filesize(d.fileSize)
                },
                {
                  Header: 'Created',
                  id: 'createdAt',
                  accessor: (d) => moment(d.createdAt).format('YYYY-MM-DD hh:mm')
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
