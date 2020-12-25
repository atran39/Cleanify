//gets the accessToken from the search bar paramater
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');

getSpotifyUsername();
getPlaylists();

let submit = document.getElementById('submit');
submit.addEventListener('click', createCleanifiedPlaylist, false);

let deleted = document.getElementById('delete');
deleted.addEventListener('click', deletePlaylist, false);

//Get's spotify username of the person whos account you are logged into
function getSpotifyUsername() {
  fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: 'Bearer ' + accessToken
    }
  })
    .then(res => res.json())
    .then(
      data =>
        (document.getElementById('theUsersName').innerHTML =
          'Signed in as ' + `<strong>${data.display_name}</strong`)
    );
}

//Get's all playlists that the user follows
async function getPlaylists() {
  try {
    let response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      let data = await response.json();
      let playlistItems = '';
      let count = 0;
      data.items.forEach(function(names) {
        count++;

        playlistItems += `
        
            <ul class="list-group list-group-flush">
              <li class="list-group-item"> <input type = "radio" name="playlistTitles" id="${names.id}" value="${names.name}">  ${names.name}</li>
            </ul>
      
      `;
      });
      document.getElementById('playlistItems').innerHTML = playlistItems;
    }
  } catch(e) {
    console.log(e);
  }
}

async function deletePlaylist() {
  try {
    let checkedPlaylistID = getPlaylistID();

    let response = await fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/followers`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    });
    location.reload();

  } catch(e) {
    console.log(e);
  }
}

function getPlaylistID() {
  let OGPlaylistID;
  let ele = document.getElementsByName('playlistTitles');
  for (i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      OGPlaylistID = ele[i].id; //get playlistID of checked playlist

      return OGPlaylistID;
    }
  }
}

function getPlaylistName() {
  let oldPlaylistName = '';
  let OGPlaylistID;
  let ele = document.getElementsByName('playlistTitles');
  for (i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      oldPlaylistName = ele[i].value; //get the name of the checked playlist

      return oldPlaylistName;
    }
  }
}

//once the "cleanify playlist button" is pressed, this function
//creates a new playlist based off of the existing playlists name, and
//it displays the tracks of the original playlist and shows which tracks
//are explicit

async function createCleanifiedPlaylist() {
  try {
    let targetPlaylistName = getPlaylistName();
    let targetPlaylistID = getPlaylistID();

    let originalPlaylistTracks = await getPlaylistTracks(targetPlaylistID);

    let trackUriTargetPromiseList = [];
    let tracksInTargetPlaylistHtml = ``; // used to display "before" playlist
    originalPlaylistTracks.forEach(function(origTrack) {
      var searchPromise = searchForSong(origTrack);
      trackUriTargetPromiseList.push(searchPromise);

      tracksInTargetPlaylistHtml += `
          <ul class="list-group list-group-flush">
            <li  class="list-group-item" name="trackTitles" trackId="${origTrack.track.id}" explicit="${origTrack.track.explicit}">${origTrack.track.name}</li>
          </ul>
        `;
    });

    // display original tracks in the playlist
    document.getElementById('tracksInPlaylist').innerHTML = tracksInTargetPlaylistHtml;
    document.getElementById(
      'numberOfSongsBeforeCleanified'
    ).innerHTML = `(${originalPlaylistTracks.length} total)`;

    // wait for searches of all the songs to complete
    Promise.all(trackUriTargetPromiseList).then(async function(trackUriList) {
      let tracksInNewPlaylist = ``;
      trackUriList.forEach(function(trackUri) {
        if (trackUri) {
          tracksInNewPlaylist += `
          <ul class="list-group list-group-flush">
          <li  class="list-group-item" name="trackTitles" trackId="${trackUri.id}" explicit="${trackUri.explicit}">${trackUri.name}</li>
            </ul>
        `;
        }
      });

      document.getElementById(
        'tracksInNewPlaylist'
      ).innerHTML = tracksInNewPlaylist;
      document.getElementById(
        'numberOfSongsAfterCleanified'
      ).innerHTML = `(${tracksInNewPlaylist.length} total)`;

      let newPlaylistID = await makeNewPlaylist(targetPlaylistName);

      addTracksIntoPlaylist(newPlaylistID, trackUriList);    
    });
  } catch(e) {
    console.log(e);
  }
}

async function getPlaylistTracks(playlistId) {
  try {
    //Gets the tracks of the OG Playlist
    let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    return data.items;
  } catch(e) {
    console.log(e);
  }
  
}

async function makeNewPlaylist(checkedPlaylistName) {
  try {
    //creates new playlist
    let response = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      body: JSON.stringify({
        name: checkedPlaylistName + ' (DeCleaned)',
        public: false
      }),
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    return data.id;
  } catch(e) {
    console.log(e);
  }
}

async function addTracksIntoPlaylist(playlistID, cleanTracks) {
  try {
    // map tracks to track uri's 
    var cleanTracksUriList = [];
    cleanTracks.forEach(function(trackObj) {
      if (trackObj) {
        cleanTracksUriList.push(trackObj.uri);
      }
    });

    // spotify has limit of 100 tracks that can be added to a playlist in single api call
    let curIndex = 0;
    do {
      var cleanTracksUriSlice = cleanTracksUriList.slice(curIndex, curIndex +100);
      
      //  `https://api.spotify.com/v1/playlists/5U74wGWvE7pepqLyYSklT1/tracks`,
      let response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
        method: 'POST',
        body: JSON.stringify({
          uris: cleanTracksUriSlice
        }),
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application
        }
      });
      
      let data = await response.json();

      curIndex += 100;
    } while (cleanTracks.length - curIndex > 0);
  } catch(e) {
    console.log(e);
  }
  
}

async function searchForSong(origSongUri) {
  try {
    // better search with artist names
    var artistListStr = ''
    origSongUri.track.artists.forEach(function(artists) {
      artistListStr += artists.name + ' '
    });

    var songSearchString = `${origSongUri.track.name} ${artistListStr}`.trim();

    let response = await fetch(` https://api.spotify.com/v1/search?q=${songSearchString}&type=track&limit=5`, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    if (data.tracks.items.length) {
      data.tracks.items.forEach(function(trackUri) {
        if (trackUri.explicit) {
          return trackUri;
        }
      });
      // if execution reaches here, there is no explicit version of the song. return top song
      return data.tracks.items[0];
    } else {
      console.log('couldnt find ' + songTitle);
      return null;
    }
  } catch(e) {
    console.log(e);
  }
}