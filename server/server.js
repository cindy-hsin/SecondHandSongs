
const express = require('express');
const app = express();				// Instantiate an Express application.
const axios = require('axios');



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
let coverRecords = [];

/**  
 * Returns a "Cover" objects: 
 * {coverName: "", performerName: "", songId: "", spotifyTrackUrl: "", youtubeUrl: ""};
 * Input: 
*/
function buildCoverRecord() {
  let cover = {};


  return cover;
}


function appendIntoCoverRecords(cover) {

}



// CoverId VARCHAR(255) auto_incremented,
// CoverName 
// PerformerName
// SongId
// SpotifyTrackUrl (link to Spotify UI/webpage to play the track)
// YoutubeUrl 


// Information to reach API
const url = 'https://secondhandsongs.com/search/performance?';
// Look for the song 'Lucky', sung by 'Jason Mraz'
const songTitle =  'dfgfyujn';//'lucky';
const artistName = 'ijvdssry';//'jason%20mraz';
const queryString = 'op_title=contains&' + `title=${songTitle}&` + 
'op_performer=contains&' +  `performer=${artistName}`; 
const searchTrackEndpoint = url + queryString;

startProcess(searchTrackEndpoint);

async function startProcess(searchTrackEndpoint) {
  const trackObj = await requestTrackUriFromQueryEndpoint(searchTrackEndpoint);
  const {trackUri, trackTitle} = trackObj;
  if (trackUri === null) {
    console.log("End Program! No track found with the query endpoint: ", searchTrackEndpoint)
    return;
  }

  const coverUriList = await requestCoverUriListFromTrackUrl(trackUri);
  if (coverUriList.length === 0) {
    console.log("End Program! No cover found for the given track: \n"
    + ` Title: ${trackTitle};  TrackUri: ${trackUri} `);
    return;
  }

  for (let cover of coverUriList) {
    await buildSingleCoverRecord(coverUri);
  }


}


// Functions to call API
async function requestDataWriteToCsv() {
  
  const coverUriSequence = await getCoverUriSequence();
  console.log(typeof(coverUriSequence));

  for (let coverUri of coverUriSequence) {
    const youtubeUri = await buildSingleCoverRecord(coverUri);
    console.log("**** Youtube Uri:", youtubeUri);
    // TODO: write each youtubeUri into CSV. (CSV table/Database Table to be designed(i.e. What columns does the DB table contain? 

  }
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
async function buildSingleCoverRecord(coverUri) {
  let cover = {
    coverName:"",
    performerName: "", 
    songId: "", 
    spotifyTrackUrl: "", 
    youtubeUrl: ""
  };

  let coverResponse = null; // TODO: Is null an appropriate default value??

  let youtubeUri;
  try {
    coverResponse = await axios.get(coverUri, {headers: {'Accept': 'application/json'}});
  } catch(err) {
    console.log(err);
  }
  console.log("**** Cover response:", coverResponse)
  const coverResponseData = coverResponse.data;
  console.log("**** Cover response Data:", coverResponseData);
  // console.log("**** Check if releases is an array", Array.isArray(coverResponseData.releases)); // true
  // console.log("**** Check if external_uri is an array", Array.isArray(coverResponseData.external_uri));  // true
  




    // TODO: Check if taking [0] element is accurate!!!
    if (coverResponseData.releases.length > 0) {
      const coverReleaseUrl = coverResponseData.releases[0].uri;
      // Make another API call to coverReleaseUrl to scrap the SpotifyTrackUrl off of HTML data. 
    }

    
    youtubeUri = (coverResponseData.external_uri).map(obj=>obj.uri);
    // console.log("**** Youtube Uri:", youtubeUri);
    // console.log(youtubeUri[0] !== undefined);
    // console.log("**** Check if youtubeUri is an array", Array.isArray(youtubeUri)); // true


  if (youtubeUri.length > 0) {return youtubeUri[0];}
  return null;
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