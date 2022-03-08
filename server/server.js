const express = require('express');
const app = express();				// Instantiate an Express application.
const axios = require('axios');

const fs = require('fs');
const {parse} = require('csv-parse');
const {stringify} = require('csv-stringify');
const {transform} = require('stream-transform');

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


/** A global list of cover record objects, which will eventually be written into csv file.*/
// const coverRecords = [];

startProcess();
async function startProcess() {
  const readStream = fs.createReadStream('/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/songsWithArtistName.csv');
  const parser = readStream.pipe(parse({delimiter: ',', columns: [
    "SongId", "SongName", "SpotifyId", "ArtistId", "AlbumId", "ArtistName"
  ], from_line:2, to_line: 3}));    // Add options!!
  

  // Transformer: parser reads in all columns. Transformer can help filter out unwanted columns.
  const transformer = parser.pipe(transform(function (data) {
    console.log(data);
    return {SongId: data['SongId'], SongName: data['SongName'], ArtistName: data['ArtistName']};  // lacking artistName
  }))

  const stringifier = stringify({header: true, 
    columns: ['CoverName','PerformerName','YoutubeUri', 'SongId', 'SongName', 'ArtistName'],quoted: true, quoted_empty: true}); //?'SongName', 'ArtistName' are duplicate info. Should be dropped

    // Async API calls:
    const url = 'https://secondhandsongs.com/search/performance?';  

    for await (const record of transformer) { // Each record is a (original) track info
      // const covers = await new Promise((resolve, reject) => {
      //   if (false) reject('Error message');
      //   else resolve([{CoverName: 'lucky', YoutubeUrl: 'https://wertyujhgfdsweaytuijh'},
      //                 {CoverName: 'lucky2', YoutubeUrl: 'https://wertyujhgfdsweaytuijh'}]);
      // });
      const songTitle =  record.SongName;//'lucky';
      const artistName = record.ArtistName;//'jason%20mraz';     // TODO: Uncomment, after reading source csv has been added the field: "ArtistName"
      const queryString = 'op_title=contains&' + `title=${songTitle}&` + 
      'op_performer=contains&' +  `performer=${artistName}`; 
      const searchTrackEndpoint = url + queryString;

      const coverList = await collectCoverRecords(searchTrackEndpoint);   // Return a list of cover objects, OR null.
      // Could be null if :
      // No track found with the query endpoint; OR
      // No cover found for the given track;
      if (coverList === null) {
        console.log(`No cover found for SongTitle=${songTitle}, ArtistName=${artistName}!!`);
        continue;
      }

      for (const cover of coverList) {
        record.CoverName = cover.CoverName;
        record.PerformerName = cover.PerformerName;
        record.YoutubeUri = cover.YoutubeUri;
        stringifier.write(record);
      }

      // record.CoverName = cover.CoverName;
      // record.YoutubeUrl = cover.YoutubeUrl;
      // stringifier.write(record);
  }
  const writeStream = fs.createWriteStream('/Users/cindychen/Documents/NEU/Course_Material/cs5200/Project/second_hand_songs/testData/result.csv');

  stringifier.pipe(writeStream);
  stringifier.end();
}

// CoverId INT auto_incremented,
// CoverName string
// PerformerName string
// SongId INT
// SpotifyTrackUrl (link to Spotify UI/webpage to play the track) string
// YoutubeUrl  string


// // Information to reach API
// const url = 'https://secondhandsongs.com/search/performance?';
// // Look for the song 'Lucky', sung by 'Jason Mraz'
// const songTitle =  'dfgfyujn';//'lucky';
// const artistName = 'ijvdssry';//'jason%20mraz';
// const queryString = 'op_title=contains&' + `title=${songTitle}&` + 
// 'op_performer=contains&' +  `performer=${artistName}`; 
// const searchTrackEndpoint = url + queryString;



// collectCoverRecords(searchTrackEndpoint);


/**
 * Wrapper function that collects cover records for each songId from database.
 * @param {*} searchTrackEndpoint 
 * @returns 
 */
async function collectCoverRecords(searchTrackEndpoint) {
  const coverList = [];

  const trackObj = await requestTrackUriFromQueryEndpoint(searchTrackEndpoint);
  const {trackUri, trackTitle} = trackObj;
  if (trackUri === null) {
    console.log("End Program! No track found with the query endpoint: ", searchTrackEndpoint)
    return null;
  }

  const coverUriList = await requestCoverUriListFromTrackUrl(trackUri);
  if (coverUriList.length === 0) {
    console.log("End Program! No cover found for the given track: \n"
    + ` Title: ${trackTitle};  TrackUri: ${trackUri} `);
    return null;
  }

  for (let coverUri of coverUriList) {
    const cover = await buildSingleCoverRecord(coverUri);
    coverList.push(cover);
  }
  return coverList;   // Here, coverList must be non-empty.
}


// Functions to call API
// async function requestDataWriteToCsv() {
  
//   const coverUriSequence = await getCoverUriSequence();
//   console.log(typeof(coverUriSequence));

//   for (let coverUri of coverUriSequence) {
//     const youtubeUri = await buildSingleCoverRecord(coverUri);
//     console.log("**** Youtube Uri:", youtubeUri);
//     // TODO: write each youtubeUri into CSV. (CSV table/Database Table to be designed(i.e. What columns does the DB table contain? 

//   }
// }



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
    console.log("**** Query response Data:", queryResponseData);
    // TODO: queryResponseData may not have results. (queryResponseData.resultPage may be empty)
    // e.g. **** Query response Data: { totalResults: 0, resultPage: [], skippedResults: 0 }
   
    if (queryResponseData.resultPage.length > 0) {
      trackUri = (queryResponseData.resultPage)[0].uri;
      trackTitle = (queryResponseData.resultPage)[0].title;
    }
  } catch(err) {
    console.log(err);
  }
  
  console.log("**** Track uri", trackUri);
  console.log("**** Track title", trackTitle);
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
    console.log(err);
  }

  console.log("**** Cover Uri List:", coverUriList);
  return coverUriList;
}

// {coverName: "", performerName: "", songId: "", spotifyTrackUrl: "", youtubeUrl: ""};
// Rename: buildSingleCoverRecord

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
  }; // CoverName, YoutubeUrl

  try {
    const coverResponse = await axios.get(coverUri, {headers: {'Accept': 'application/json'}});
    // console.log("**** Cover response:", coverResponse);
    const coverResponseData = coverResponse.data;
    console.log("**** Cover response Data:", coverResponseData);

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
      console.log("########### CHECK! cover.YoutubeUri: ", cover.YoutubeUri);
    }

  } catch(err) {
    console.log("Error when querying to ", coverUri +": "+ err);
  }
  // console.log("**** Check if releases is an array", Array.isArray(coverResponseData.releases)); // true
  // console.log("**** Check if external_uri is an array", Array.isArray(coverResponseData.external_uri));  // true

  
  // console.log("**** Youtube Uri:", youtubeUri);
  // console.log(youtubeUri[0] !== undefined);
  // console.log("**** Check if youtubeUri is an array", Array.isArray(youtubeUri)); // true
    // coverName:"",
    // performerName: "", 
    // songId: "",    //==> Not here!! 
    // spotifyTrackUrl: "", 
    // youtubeUrl: ""
  return cover;
}






// coverUriList.forEach((coverUri) => getSingleCoverExternalUri(coverUri));



// axios.get(endpoint, {headers: {'Accept': 'application/json'}})
//   .then(response => console.log(response.data))
//   .catch(error => console.log(error));




//Create a new route in express called /getAPIResponse. 
// This route will make a REST API call and return the response as JSON.


// async function getAPIResponseHandler(req, res) {
//   let result;
//   try {
//     result = await api_helper.make_API_call(endpoint);
//   } catch(error) {
//     console.log("1st API call:", error);
//     return;
//   }
//   console.log("1st API call succeeded!");
  
  

  // res.json(result);
  // let jsonResult;
  // try {
  //   jsonResult = await res.json(result);
  //   console.log("jsonResult:", jsonResult);
  // } catch(error) {
  //   console.log("Jsonfy 1st call's result:", error);
  //   return;
  // }

  // const trackUrl = jsonResult.resultPage;
  // console.log("trackUrl: ", trackUrl);
  // let trackResult;
  // try {
  //   trackResult = await api_helper.make_API_call(trackUrl);
  // } catch(error) {
  //   console.log("2nd API call:", error);
  //   return;
  // }

  // let jsonTrackResult;
  // try{
  //   jsonTrackResult = await res.json(trackResult);
  // } catch(error) {
  //   console.log("Jsonfy 2nd call's result:", error);
  //   return;
  // }

// }

// app.get('/getAPIResponse', getAPIResponseHandler);
// app.get('/getAPIResponse', (req, res) => {
//   // API code will be here
//   api_helper.make_API_call(endpoint)
//   .then(response => {
//     return new Promise((resolve, reject)=>{resolve(res.json(response))});
    
//     // const trackUrl = jsonResult.resultPage[0].uri;
//     // res.send('jsonResult: ',jsonResult);
//     // return new Promise((resolve,reject) => {
//     //   resolve(trackData);
//     // })       
//   })
//   .then(response => {
//     res.send(response);
//     // console.log(response);
//   })
//   .catch(error => {
//     res.send(error)
//   })
// })


app.listen(3000, ()=>{console.log('App started on port 3000');});