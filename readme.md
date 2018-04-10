# data-upload-tool

This project serves as a boilerplate for integrating resumable file uploads into your project. It leverages [resumable.js](http://www.resumablejs.com/) to split a file into chunks and transmit it to the server, and re-assemble once completed. 

## Features

* Minimal dependencies
* Resumable uploads across sessions/browsers
* Auto-unzip archives on server
* Robust logging for each file 

## Project structure

This repository contains two projects: a nodejs backend, and a React front-end.

### Running the Nodejs Project

* `cd nodejs`
* `yarn`
* `node server.js`
* Navigate to `http://localhost:3200/ping` and you should see a response. 

### Running the React Project

* `cd frontend-react`
* `yarn`
* `yarn run start`

Navigate to `http://localhost:3000/` and you should see the project being served. 

## How it Works

Using [resumable.js](http://www.resumablejs.com/), the file is uploaded to the server in chunks that are stored in a temporary location. Once complete, the file is re-assembled on the server and ran through any applicable pipelines (for example, if it is a zip archive, it will automatically unzip the files on the server). 
