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
const coverRecords = [];


const users = [];
// function generateUsername(firstname, surname) {
//     return `${firstname[0]}-${surname}`.toLowerCase();
// }
// fs.createReadStream(' /Users/cindychen/Documents/NEU/Course_Material/cs5200/CS5200_GROUP/data/songs.csv') 
//   .pipe(csvParser())
//   .on('data', function (row) {
//     const username = generateUsername(row.Firstname, row.Surname);
//     const password = randomWords(3).join("-");
    
//     const user = {
//         username,
//         firstname: row.Firstname,
//         surname: row.Surname,
//         roles: row.Roles,
//         password
//     }
//     users.push(user)
//   })
//   .on('end', function () {
//       console.table(users)
//       // TODO: SAVE users data to another file
//     })

async function startProcess() {
  const readStream = fs.createReadStream('/Users/cindychen/Documents/NEU/Course_Material/cs5200/CS5200_GROUP/data/songs.csv');
  const parser = readStream.pipe(parse({delimiter: ',', columns: [
    "SongId", "SongName", "SpotifyId", "ArtistId", "AlbumId"
  ], from_line:2, to_line: 5}));    // Add options!!
  
  const transformer = parser.pipe(transform(function (data) {
    console.log(data);
    return {SongId: data['SongId'], SongName: data['SongName']};  // lacking artistName
  }))

  const stringifier = stringify({header: true, 
    columns: ['CoverName', 'YoutubeUrl', 'SongId', 'SongName'],quoted: true, quoted_empty: true}) //?
  
    for await (const record of transformer) {
      const covers = await new Promise((resolve, reject) => {
        if (false) reject('Error message');
        else resolve([{CoverName: 'lucky', YoutubeUrl: 'https://wertyujhgfdsweaytuijh'},
                      {CoverName: 'lucky2', YoutubeUrl: 'https://wertyujhgfdsweaytuijh'}]);
      });

      for (const cover of covers) {
        record.CoverName = cover.CoverName;
        record.YoutubeUrl = cover.YoutubeUrl;
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

startProcess();