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
    let checkedPlaylistID = getCheckedPlaylistID();
    let checkedPlaylistName = getCheckedPlaylistName();

    let response = await fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/followers`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    });
    location.reload();

    // alert(`Deleted playlist named: ${checkedPlaylistName}`);
  } catch(e) {
    console.log(e);
  }
}

function getCheckedPlaylistID() {
  let OGPlaylistID;
  let ele = document.getElementsByName('playlistTitles');
  for (i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      OGPlaylistID = ele[i].id; //get playlistID of checked playlist

      return OGPlaylistID;
    }
  }
}

function getCheckedPlaylistName() {
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
    let checkedPlaylistName = getCheckedPlaylistName();
    let checkedPlaylistID = getCheckedPlaylistID();

    let newlyCreatedPlaylistID = '';
    //creates new playlist
    let response = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      body: JSON.stringify({
        name: checkedPlaylistName + ' (Explicit)',
        public: false
      }),
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    newlyCreatedPlaylistID = data.id;
    getAndDisplayTracks(checkedPlaylistID, newlyCreatedPlaylistID);
  } catch(e) {
    console.log(e);
  }
}

async function getAndDisplayTracks(checkedPlaylistID, newPlaylistID) {
  try {
    //Gets the tracks of the OG Playlist
    let response = await fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    let cleanTracks = [];
    let tracksInPlaylist = ``;
    let totalTracks;
    data.items.forEach(function(names) {
      if (names.track.explicit) {
        cleanTracks.push(names.track);
      }
      tracksInPlaylist += `
      <ul class="list-group list-group-flush">
      <li  class="list-group-item" name="trackTitles" trackId="${names.track.id}" explicit="${names.track.explicit}">${names.track.name}</li>
        </ul>

        `;
    });

    document.getElementById('tracksInPlaylist').innerHTML = tracksInPlaylist;
    document.getElementById(
      'numberOfSongsBeforeCleanified'
    ).innerHTML = `(${data.total} total)`;

    addTracksIntoCleanfiedPlaylist(newPlaylistID, cleanTracks);
    findCleanVersionOfSongs(checkedPlaylistID, newPlaylistID);
    getAfterCleanified(newPlaylistID);

    //display "after cleanified"
  } catch(e) {
    console.log(e);
  }
}

function getAfterCleanified(newPlaylistID) {
  setTimeout(async function() {
    try {
      let response = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        }
      })

      let data = await response.json();

      let cleanTracks = [];
      let tracksInNewPlaylist = ``;
      data.items.forEach(function(names) {
        tracksInNewPlaylist += `
      <ul class="list-group list-group-flush">
      <li  class="list-group-item" name="trackTitles" trackId="${names.track.id}" explicit="${names.track.explicit}">${names.track.name}</li>
        </ul>

        `;
      });

      document.getElementById(
        'tracksInNewPlaylist'
      ).innerHTML = tracksInNewPlaylist;
      document.getElementById(
        'numberOfSongsAfterCleanified'
      ).innerHTML = `(${data.total} total)`;
    } catch(e) {
      console.log(e);
    }
  }, 3000);
}

async function addTracksIntoCleanfiedPlaylist(playlistID, cleanTracks) {
  console.log('add clean tracks')
  // console.log(cleanTracks);

  try {
    // map tracks to track uri's 
    var cleanTracksUriList = [];
    cleanTracks.forEach(function(trackObj) {
      if (trackObj) {
        cleanTracksUriList.push(trackObj.uri);
      }
    });

    console.log(cleanTracksUriList)

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
          'Content-Type': 'application/json'
        }
      });
      
      let data = await response.json();

      curIndex += 100;
    } while (cleanTracks.length - curIndex > 0);
  } catch(e) {
    console.log(e);
  }
  
}

async function findCleanVersionOfSongs(checkedPlaylistID, newPlaylistID) {
  try {
    //add all of the explicit songs you want to look for into an array
    let searchPromisesList = [];

    let response = await fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    let explicitTracks = [];
    let count = 0;
    data.items.forEach(function(names) {
      if (!names.track.explicit) {
        count++;
        
        // better search with artist names
        var artistListStr = ''
        names.track.artists.forEach(function(artists) {
          artistListStr += artists.name + ' '
        });

        var songSearchString = `${names.track.name} ${artistListStr}`.trim();
        explicitTracks.push(songSearchString);
      }
    });
    for (i = 0; i < explicitTracks.length; i++) {
      var searchPromise = searchForSong(explicitTracks[i], newPlaylistID);
      searchPromisesList.push(searchPromise);
    }

    Promise.all(searchPromisesList).then((foundTracks) => {
      addTracksIntoCleanfiedPlaylist(newPlaylistID, foundTracks);    
    })
  } catch(e) {
    console.log(e);
  }
}

async function searchForSong(songTitle, newPlaylistID) {
  // console.log('searching for ' + songTitle);

  try {
    let response = await fetch(` https://api.spotify.com/v1/search?q=${songTitle}&type=track&limit=1`, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    });

    let data = await response.json();

    // console.log(data)
    if (data.tracks.items.length) {
      songID = data.tracks.items[0];
      // console.log(songID);
      return songID;
    } else {
      console.log('couldnt find ' + songTitle);
      // eliminate artists to get better search results
      return null;
    }
  } catch(e) {
    console.log(e);
  }
}