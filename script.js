// Some code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile

// Div constants
const user = atob("YzNjNjQ4MDNiZTNiNGVkNWE4NGQ1MGIxODgxMjAxOTg=");
const artistDiv = document.getElementById('artists');
const artistGenreDiv = document.getElementById('artistsByGenre');
const searchDiv = document.getElementById('search');
const userId = atob("NmNlMTk4YmQ0MDdiNDI0OGJjNzI5MWIxMjNiYjE2OGE=")



// Button function redirects
document.getElementById("searchButton").onclick = searchSong;
document.getElementById('playlist').onchange = updateLink;
document.getElementById("hideButton").onclick = toggleRight;


// Definition of global variables
let accessToken;
let playlistJSON;
let playlistLink = "";
let playlistName;
let playlistId;
let nextPage = null;
let prevPlaylistLink;
let firstRun = true;
let loopComplete = false;
var genreDict = {};
var artistDict = {};





// Code ran on page load

// Get access token
// Store access token in cookies to reduce API requests, if found
// Cookie can also become undefined for some reason? Maybe because of being offline
if (document.cookie.split('accessToken=').length == 2 && !(document.cookie.split('accessToken=undefined').length == 2)) {
    accessToken = document.cookie.split('accessToken=')[1]
} else {
    accessToken = await getAccessToken();
    document.cookie = `accessToken=${accessToken}; max-age=3600;`
}








// Functions

// Main code ran for every search (Pressing "Find a song...")
async function searchSong() {

    // Only run playlist data retrieval if the link is 
    // different from the last press, to save API calls
    if (!(prevPlaylistLink == playlistLink)) {

        // Set status to loading, reset colour and reset hide button option
        document.getElementById('statusText').style.color = "black";
        document.getElementById('statusText').style.display = "inline";
        document.getElementById('statusText').innerHTML = "<b>&nbsp;&nbsp;Loading...</b>";
        document.getElementById("hideButton").value = "Show top artists";

        // Get playlist tracks
        playlistJSON = await getInfo();

        // Reset dictionaries
        genreDict = {};
        artistDict = {};

        // Exit function if playlist was invalid, show error text
        if (!(playlistJSON)) {
            document.getElementById('statusText').style.color = "red";
            document.getElementById('statusText').innerHTML = "<b>&nbsp;&nbsp;Invalid link.</b>";
            return;
        }

        // Ignore offset loop if the playlist has 100 or less songs
        if (!(playlistJSON.tracks.next)) {
            await updateArtistDict()
            await updateGenreDict();
            updateRight();
        }


        // Offset loop: Get song information, batches of 100 due to Spotify API limits
        while (!(nextPage == null)) {

            await updateArtistDict();
            playlistJSON = await getInfo();
        }

        // Find remainder of songs that weren't found in multiples of 100,
        // by getting the current total songs found.
        // (I couldn't find a better way to find the end part of the 100 batches)
        let sum = 0
        for (var key in artistDict) {
            sum += artistDict[key][1]
        }


        // Send request to get the remainder of songs left after the 100 batches
        nextPage = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${sum}&limit=100&market=CA&locale=en-US,en`
        playlistJSON = await getInfo();


        // Update dictionaries and right side
        await updateArtistDict();
        await updateGenreDict();
        updateRight();

        // Reset nextPage variable as search is finished
        nextPage = null;

    }

    // Only update status if it was actually visible (ex. not during a regular search)
    if (document.getElementById('statusText').style.display == "inline") {
        document.getElementById('statusText').style.display = "none";
        document.getElementById('statusText').innerHTML = "";
    }

    // Only attempt to output a song if genreDict has genres
    // (only matters for the console)
    if (!(Object.keys(genreDict).length == 0))
        await outputSong()

}



// Get JSON containing playlist songs, determine visiblity of other elements
async function getInfo() {

    // Regex to search for playlist ID
    playlistId = playlistLink.match(/(?<=\/playlist\/).*(?=\?)|(?<=\/playlist\/).*/)

    // Code to run if regex fails (not a playlist link)
    if (playlistId == null) {
        resetInfo();
        return;
    }


    // If this link is the same as the last, return as the playlist info is the same
    if (prevPlaylistLink == playlistLink && loopComplete) {
        return playlistJSON;
    }

    // Hide elements while loading, reset values
    document.getElementById("rightSide").style.display = "none";
    document.getElementById("search").style.display = "none";
    document.getElementById("hideButton").style.display = "none";
    searchDiv.innerHTML = ""
    artistDiv.innerHTML = ""
    artistGenreDiv.innerHTML = ""


    loopComplete = false;
    let result;

    // Load next page redirect if given, otherwise load from playlist input (initial press)
    if (nextPage) {
        result = await fetch(`${nextPage}`, {
            method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });

    } else {
        result = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?market=CA`, {
            method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });

    }

    let resultJSON = await result.json();

    // Code to run if playlist is not found
    if (resultJSON.error) {
        resetInfo();
        return;
    }


    // Get playlist name
    if (!(nextPage))
        playlistName = resultJSON.name;

    // Set nextPage to the redirect to the next page,
    // if this json is 
    if (resultJSON.tracks)
        nextPage = resultJSON.tracks.next
    else
        nextPage = resultJSON.next


    return resultJSON;

}



// Get the artist for each track, store information
// about artist id/occurrences for each artist in artistDict
async function updateArtistDict() {


    // If the link is the same AND it's the first search, don't update dict
    // On the first search, prev and playlist are the same because there wasn't anything before.
    if ((prevPlaylistLink == playlistLink) && !(firstRun) && !(nextPage)) {
        return;
    }

    firstRun = false;
    let json;


    // Check if this is a playlist returned by the "next" param, 
    // and use the right value to access accordingly
    if (playlistJSON.tracks)
        json = playlistJSON.tracks.items
    else
        json = playlistJSON.items


    // Get unique artists in playlist
    // artistDict stores artist name as key, with artist id and # of occurences as a list value
    for (let i = 0; i < json.length; i++) {
        let artist = json[i].track.artists[0];

        // Ignore local songs
        if (artist.id == null)
            continue;

        if (!(artist.name in artistDict))
            artistDict[artist.name] = [artist.id, 1];
        else
            artistDict[artist.name][1]++;
    }


}



// Get genres for each artist, storing them in genreDict
async function updateGenreDict() {

    // Loop through each unique artist, add to genreDict
    for (var key in artistDict) {
        let result = await fetch(`https://api.spotify.com/v1/artists/${artistDict[key][0]}`, {
            method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });

        let resultJSON = await result.json()

        let genres = resultJSON.genres;
        let artist = resultJSON.name;

        // Add genres to artistDict list value, for outputting by # of occurences
        // (could probably combine both dicts but this seems nicer)
        artistDict[artist].push(genres)

        // Adding genres/artists to genreDict
        for (var j = 0; j < genres.length; j++) {

            // Create new key for unique genres
            if (!(genres[j] in genreDict)) {
                genreDict[genres[j]] = [artist]

            // Add to existing genre key if the artist is not found in it
            // (Artists can have multiple genres? This might not be necessary)
            } else if (!(artist in genreDict[genres[j]]))
                genreDict[genres[j]].push(artist)

        }

    }


    // Lazy fix for certain playlists having duplicate artist names:
    // Remove duplicates in each of genreDict's artist lists
    // Adapted from https://stackoverflow.com/a/9229821/21809626
    for (var key in genreDict) {
        genreDict[key] = [...new Set(genreDict[key])];
    }


    // Update previous link to be this one
    prevPlaylistLink = playlistLink;
}

// Ran on "Show/Hide top artists" press
function toggleRight() {
    if (document.getElementById("hideButton").value == "Hide top artists") {
        document.getElementById("rightSide").style.display = "none";
        document.getElementById("hideButton").value = "Show top artists";
    } else {
        document.getElementById("rightSide").style.display = "inline";
        document.getElementById("hideButton").value = "Hide top artists";
    }
}

// Updates the right side of the page containing the artist details
function updateRight() {

    // Reset artist divs (might be redundant)
    artistDiv.innerHTML = ""
    artistGenreDiv.innerHTML = ""



    // Output artists by # of occurences

    document.getElementById('artistTitle').innerHTML = `Artists by occurrences in <i>${playlistName}</i>:`
    let listString = "";


    // Sort artistDict by # of occurences
    // Adapted from https://www.educative.io/answers/how-can-we-sort-a-dictionary-by-value-in-javascript (Schwartzian transform)
    var items = Object.keys(artistDict).map(
        (key) => { return [key, artistDict[key][1]] });

    items.sort(
        (first, second) => { return second[1] - first[1] }
    );

    var keys = items.map(
        (e) => { return e[0] });
    
    // Loop through each key of dict, now in greatest-least order
    for (var i = 0; i < keys.length; i++) {
        let artist = keys[i]
        let occurences = artistDict[artist][1]
        let genres = artistDict[artist][2]


        if (genres.length == 0)
            genres = "N/A"

        listString += `<li><b>${artist}</b>, Occurrences: ${occurences}, Genres: ${genres.slice(0, 5)}</li>\n`
    }

    artistDiv.innerHTML += "<ol type=\"1\">\n" + listString + "</ol>\n"



    // Output artists by each genre
    document.getElementById('genreTitle').innerHTML = `Artists by Genre in <i>${playlistName}</i>:`

    for (var key in genreDict) {
        artistGenreDiv.innerHTML += `<p>${key}:<p>\n<ul>`

        // Print list of artists for that genre
        for (var i = 0; i < genreDict[key].length; i++) {
            artistGenreDiv.innerHTML += `<li>${genreDict[key][i]}</li>`
        }

        // Add to artistGenreDiv's HTML a list of each artist/genre
        artistGenreDiv.innerHTML += "</ul>\n<p>&nbsp;</p>";
    }

    // Display search and hide button as search is now fully finished
    document.getElementById("search").style.display = "inline";
    document.getElementById("hideButton").style.display = "inline";
}



// Outputs a song matching the genre specified, with <10% popularity
async function outputSong() {

    // Random genre from dictionary, adapted from https://stackoverflow.com/questions/61042479/how-to-get-a-random-key-value-from-a-javascript-object
    // Separating keys from genreInput is just for readability
    let keys = Object.keys(genreDict);
    let genreInput = keys[Math.floor(Math.random() * keys.length)]

    let artistsOfGenre = genreDict[genreInput]
    let matchingArtist = artistsOfGenre[Math.floor(Math.random() * artistsOfGenre.length)]

    // Convert genre to URL-usable text
    genreInput = genreInput.replace(/\s/g, "+")

    // Get 20 songs matching genre w/ hipster tag, and pick a random one to show
    const songInfo = await fetchSong(accessToken, `https://api.spotify.com/v1/search?q=tag%3Ahipster+genre%3A"${genreInput}"&type=track&market=US&limit=20&include_external=audio`);
    let randomSongID = songInfo.tracks.items[Math.floor(Math.random() * songInfo.tracks.items.length)].id

    // Display found song w/ details + embed
    searchDiv.innerHTML = `<h1>Found a song:</h1>\n<p>Genre: <b>${genreInput.replace(/\+/g, " ")}</b>, matching artist: <b>${matchingArtist}</b></p>`;
    searchDiv.innerHTML += `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${randomSongID}?utm_source=generator" height="10%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>                <p>&nbsp;</p>`

}




// Helper functions


// Update link on every change
function updateLink() {
    playlistLink = document.getElementById('playlist').value;
}



// Reset visibilty and global values
function resetInfo() {
    document.getElementById("rightSide").style.display = "none";
    document.getElementById("search").style.display = "none";
    document.getElementById("hideButton").style.display = "none";
    prevPlaylistLink = null;
    nextPage = null;
    playlistId = null;
    artistDiv.innerHTML = ""
    artistGenreDiv.innerHTML = ""
    searchDiv.innerHTML = ""
    nextPage = null;
    artistDict = {};
    genreDict = {};
}



// Searches for a song given genre from outputSong()
async function fetchSong(token, request) {
    const result = await fetch(request, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}





// From Spotify Web API Template:
// Returns access token
export async function getAccessToken() {

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { 'Authorization': 'Basic ' + btoa(user + ':' + userId), "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}





