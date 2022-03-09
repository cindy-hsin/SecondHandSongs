const express = require('express');
const app = express();				// Instantiate an Express application.
const axios = require('axios');

const fs = require('fs');
const {parse} = require('csv-parse');
const {stringify} = require('csv-stringify');
const {transform} = require('stream-transform');

const { createLogger, format, transports } = require("winston");
// Logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.metadata({fillExcept: ['timestamp','level', 'message']})
  ),

  transports: [new transports.File({
    filename: "/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/file.log",
    format: format.combine(format.json(), format.prettyPrint()) 
  })],
  exceptionHandlers: [new transports.File({ filename: "/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/exceptions.log" })],
  rejectionHandlers: [new transports.File({ filename: "/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/rejections.log" })],
})


/**
 * songsWithArtistName.csv
 * 
 * Read from "songsWithArtistName.csv".
 * For each song record:
 *   extract its SongName and ArtistName;
 *   use SongName as songTitle, ArtistName as artistName, to update queryString and endpoint;
 *   call buildCoverInfo() with the song's endpoint.
 */

/** Potential Issues:
 * 1. Query result: Since we set serach option as "contains" instead of "equal", 
 *    there might be multiple track object in queryResponseData.resultPage. 
 *    Currently we only take (queryResponseData.resultPage)[0] as the target track and then search for cover infos.
 *    But [0] might not be the correct target track.
 * 2. 
 * 
 */

startProcess();
async function startProcess() {
  const readStream = fs.createReadStream('/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/songsWithArtistName.csv');
  const parser = readStream.pipe(parse({delimiter: ',', columns: [
    "SongId", "SongName", "SpotifyId", "ArtistId", "AlbumId", "ArtistName"
  ], from_line:2, to_line: 3}));    // Add options!!
  

  // Transformer: parser reads in all columns. Transformer can help filter out unwanted columns.
  const transformer = parser.pipe(transform(function (data) {
    // console.log(data);
    return {SongId: data['SongId'], SongName: data['SongName'], ArtistName: data['ArtistName']};  // lacking artistName
  }))

  const stringifier = stringify({header: true, 
    columns: ['CoverName','PerformerName','YoutubeUri', 'SongId', 'SongName', 'ArtistName'],quoted: true, quoted_empty: true}); //?'SongName', 'ArtistName' are duplicate info. Should be dropped

    // Async API calls:
    const url = 'https://secondhandsongs.com/search/performance?';  

    for await (const record of transformer) { // Each record is a (original) track info

      const songTitle =  record.SongName;//'lucky';
      const artistName = record.ArtistName;//'jason%20mraz';     // TODO: Uncomment, after reading source csv has been added the field: "ArtistName"
      const queryString = 'op_title=contains&' + `title=${songTitle}&` + 
      'op_performer=contains&' +  `performer=${artistName}`; 
      const searchTrackEndpoint = url + queryString;
      logger.info('===== Start collecting cover records for SongId: ' + record.SongId +  ', SongTitle: '+ songTitle + ", ArtistName: " + artistName + " ======");
      console.log('===== Start collecting cover records for SongId: ' + record.SongId +  ', SongTitle: '+ songTitle + ", ArtistName: " + artistName + " ======");
      
      const coverList = await collectCoverRecords(searchTrackEndpoint, songTitle, artistName);   // Return a list of cover objects, OR null.
      // Could be null if :
      // No track found with the query endpoint; OR
      // No cover found for the given track;
      if (coverList === null) {
        // console.log(`!! No cover result for SongTitle=${songTitle}, ArtistName=${artistName}!!`);
        continue;
      }

      for (const cover of coverList) {
        record.CoverName = cover.CoverName;
        record.PerformerName = cover.PerformerName;
        record.YoutubeUri = cover.YoutubeUri;
        stringifier.write(record);
      }
  }
  const writeStream = fs.createWriteStream('/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/result.csv');

  stringifier.pipe(writeStream);
  stringifier.end();
  logger.info('PROCESS END!');
  console.log('PROCESS END!');
}


/**
 * Wrapper function that collects cover records for each songId from database.
 * @param {*} searchTrackEndpoint 
 * @returns 
 */
async function collectCoverRecords(searchTrackEndpoint, songTitle, artistName) {
  const coverList = [];

  const trackObj = await requestTrackUriFromQueryEndpoint(searchTrackEndpoint);
  const {trackUri, trackTitle} = trackObj;
  if (trackUri === null) {
    logger.info("!! No track found with the query endpoint: ", searchTrackEndpoint);
    console.log("!! No track found with the query endpoint: ", searchTrackEndpoint);
    return null;
  }

  const coverUriList = await requestCoverUriListFromTrackUrl(trackUri);
  if (coverUriList.length === 0) {
    logger.info("!! No cover found for the given track: \n"
    + ` trackTitle: ${trackTitle};  trackUri: ${trackUri};  originalSongTitle:  ${songTitle};  originalArtistName: ${artistName}`);
    console.log("!! No cover found for the given track: \n"
    + ` trackTitle: ${trackTitle};  trackUri: ${trackUri};  originalSongTitle:  ${songTitle};  originalArtistName: ${artistName}`);
    return null;
  }

  for (let coverUri of coverUriList) {
    const cover = await buildSingleCoverRecord(coverUri);
    coverList.push(cover);
  }
  return coverList;   // Here, coverList must be non-empty.
}


/**
/** Return the trackUri and trackTitle from queryString.
 * 
 * 
 * Return: The SecondHandSong {url, title} of the top listed track in the query result;
 *         Or {null, null}, when there's no result for the query.
*/
async function requestTrackUriFromQueryEndpoint(searchTrackEndpoint) {
  let trackUri = null;      // TODO: Is null an appropriate default value?
  let trackTitle = null;
  
  try {
    const queryResponse = await axios.get(searchTrackEndpoint, {headers: {'Accept': 'application/json'}});
    const queryResponseData = queryResponse.data;
    logger.info("****  Query response Data: ", queryResponseData);
    console.log("**** Query response Data: ", queryResponseData);
    // TODO: queryResponseData may not have results. (queryResponseData.resultPage may be empty)
    // e.g. **** Query response Data: { totalResults: 0, resultPage: [], skippedResults: 0 }
   
    if (queryResponseData.resultPage.length > 0) {
      trackUri = (queryResponseData.resultPage)[0].uri;
      trackTitle = (queryResponseData.resultPage)[0].title;
    }
  } catch(err) {
    console.log("Error when querying for track uri from query endpoint ", searchTrackEndpoint +": "+ err);
  }
  
  logger.info("**** Track uri: "+ trackUri);
  logger.info("**** Track title: "+ trackTitle);
  console.log("**** Track uri: " + trackUri);
  console.log("**** Track title: " + trackTitle);
  return {trackUri, trackTitle};
}


/** Return a list of the target track's cover uri's.  
 * 
 * Input: A non-null trackUri
 * Return: a non-empty list of target track's cover uri's;
 *         OR, an empty list when there's no cover for this track.
*/
async function requestCoverUriListFromTrackUrl(trackUri) {
  let coverUriList = [];

  try {
    const trackResponse = await axios.get(trackUri, {headers: {'Accept': 'application/json'}});
    const trackResponseData = trackResponse.data;
    // console.log("**** Track response Data:", trackResponseData);
    
    if (trackResponseData.covers.length > 0) {
      coverUriList = trackResponseData.covers.map(coverObj => coverObj.uri);
    }
  } catch(err) {
    console.log("Error when querying for cover uri list from track url: ", trackUri +": "+ err);
  }

  logger.info("**** Cover Uri List: ", coverUriList);
  console.log("**** Cover Uri List: " + coverUriList);
  return coverUriList;
}


/**
 * Returns a single cover object that contains coverName, performerName, 
 *   songId (database foregin key, referencing a unique record in Song Table), 
 *   spotifyTrackUrl, youtubeUrl (to be displayed to user)
 * @param {*} coverUri 
 * @returns a single cover object; object properties may have null value,
 * depending on the response data.
 */
async function buildSingleCoverRecord(coverUri) {
  const cover = {
    CoverName: null, 
    PerformerName :null,
    YoutubeUri: null    //TODO: add SpotifyTrackUri
  }; 

  try {
    const coverResponse = await axios.get(coverUri, {headers: {'Accept': 'application/json'}});
    // console.log("**** Cover response:", coverResponse);
    const coverResponseData = coverResponse.data;
    logger.info("**** Cover response Data: ", coverResponseData);

    cover.CoverName = coverResponseData.title;
    cover.PerformerName = coverResponseData.performer.name;  // TODO: Can coverResponseData.performer be null/empty??
    
        // TODO: Check if taking [0] element is accurate!!!
    if (coverResponseData.releases.length > 0) {
      const coverReleaseUrl = coverResponseData.releases[0].uri;
      // TODO: Make another API call to coverReleaseUrl to scrap the SpotifyTrackUrl off of HTML data. 
      // TODO: cover.SpotifyTrackUrl = (result of API call).
    }

    if (coverResponseData.external_uri.length > 0) {
      cover.YoutubeUri = ((coverResponseData.external_uri)[0]).uri; // TODO: Check if taking [0] element is accurate!!!
    }

  } catch(err) {
    console.log("Error when querying to ", coverUri +": "+ err);
  }
  console.log("**** Cover Record Successfuly built:" + cover);
  return cover;
}



app.listen(3000, ()=>{console.log('App started on port 3000');});