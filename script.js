// Code adapted from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile


// Div constants
const user = "user";
const artistDiv = document.getElementById('artists');
const artistGenreDiv = document.getElementById('artistsByGenre');
const searchDiv = document.getElementById('search');
const userId = "userId"



// Button function redirects
document.getElementById("searchButton").onclick = searchSong;
document.getElementById('playlist').onchange = updateLink;
document.getElementById("hideButton").onclick = toggleRight;


// Definition of global variables
let accessToken;
let playlistJSON;
let playlistLink = "";
let playlistName;
let nextPage = null;
let prevPlaylistLink;
let firstRun = true;
let runLoop = false;
let loopComplete = false;
var genreDict = {};
var artistDict = {};





// Code ran on page load

// Redirects to original site if reloaded, adapted from https://stackoverflow.com/a/53307588/21809626
const pageAccessedByReload = (
    (window.performance.navigation && window.performance.navigation.type === 1) ||
    window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload')
);

if (pageAccessedByReload)
    document.location = "http://localhost:5173/"


// Store access token in cookies to reduce API requests, if found
// Cookie can also become undefined for some reason? Maybe because of being offline
if (document.cookie.split('accessToken=').length == 2 && !(document.cookie.split('accessToken=undefined').length == 2)) {
    accessToken = document.cookie.split('accessToken=')[1]
} else {
    accessToken = await getAccessToken();
    document.cookie = `accessToken=${accessToken}; max-age=3600;`
}



// Main code ran for every search
async function searchSong() {

    // Only run playlist data retrieval if the link is different
    if (!(prevPlaylistLink == playlistLink)) {
        playlistJSON = await getInfo();

        console.log(playlistJSON)

        // Reset dictionaries
        genreDict = {};
        artistDict = {};

        // Ignore loop if the playlist has 100 or less songs
        if ((playlistJSON) && !(playlistJSON.tracks.next)) {
            await updateDict()
            await updateGenreDict();
            updateRight();
            runLoop = false;
        }

        // Only run if playlist was successfully found
        if (runLoop) {


            // Get song information, multiples of 100
            while (!(nextPage == null)) {
                console.log("Updating dictionary...")
                await updateDict();

                console.log("Running getInfo...")
                playlistJSON = await getInfo();

            }

            // Find remainder of songs that weren't found in multiples of 100,
            // only if playlist actually does have more than 100 songs
            // (I couldn't find a better way to find the end part of the 100 batches,
            // and doing this satisfies both >100 songs and <100 songs)
            let sum = 0
            for (var key in artistDict) {
                sum += artistDict[key][1]
            }
            console.log(sum)

            if (sum >= 100) {

                // Kind of a lazy way to change the request
                nextPage = `https://api.spotify.com/v1/playlists/1ob2hqvSK4PYHv48W7lKJo/tracks?offset=${sum}&limit=100&market=CA&locale=en-US,en`
                console.log("Running getInfo...")
                playlistJSON = await getInfo();

                console.log("Updating dictionary...")
                await updateDict();
            }


            await updateGenreDict();

            updateRight();

            nextPage = null;
        }
    }

    if (!(Object.keys(genreDict).length == 0))
        await outputSong()

}



// Update link on every change
function updateLink() {
    playlistLink = document.getElementById('playlist').value;
}


// Get JSON containing playlist songs, determine visiblity of other elements
async function getInfo() {

    let playlistId = playlistLink.match(/(?<=\/playlist\/).*(?=\?)|(?<=\/playlist\/).*/)

    // Code to run if regex fails (not a playlist link)
    if (playlistId == null) {
        console.log("Invalid link")
        document.getElementById("rightSide").style.display = "none";
        document.getElementById("search").style.display = "none";
        document.getElementById("hideButton").style.display = "none";
        runLoop = false;
        prevPlaylistLink = null;
        nextPage = null;
        artistDiv.innerHTML = ""
        artistGenreDiv.innerHTML = ""
        searchDiv.innerHTML = ""
        artistDict = {};
        genreDict = {};
        return;
    }


    // If this link is the same as the last, return as the playlist info is the same
    if (prevPlaylistLink == playlistLink && loopComplete) {
        return playlistJSON;
    }

    // Hide elements while loading
    document.getElementById("rightSide").style.display = "none";
    document.getElementById("search").style.display = "none";
    document.getElementById("hideButton").style.display = "none";
    
    loopComplete = false;
    let result;

    // Load next page redirect if given, otherwise load from playlist input
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
        console.log("Invalid playlist")
        document.getElementById("rightSide").style.display = "none";
        document.getElementById("search").style.display = "none";
        document.getElementById("hideButton").style.display = "none";
        runLoop = false;
        prevPlaylistLink = null;
        artistDiv.innerHTML = ""
        artistGenreDiv.innerHTML = ""
        searchDiv.innerHTML = ""
        nextPage = null;
        artistDict = {};
        genreDict = {};
        return;
    }

    runLoop = true;
    // Get playlist name

    if (!(nextPage))
        playlistName = resultJSON.name;

    // Make right elements visible if playlist is loaded successfully, and wasn't loaded before

    console.log("Playlist retrieved")




    if (resultJSON.tracks)
        nextPage = resultJSON.tracks.next
    else
        nextPage = resultJSON.next

    console.log(`Next page: ${nextPage}`)

    return resultJSON;

}


// Ran on "Timeframe" dropdown change
async function updateDict() {


    // Regular: JSON.tracks.items
    // Next: JSON.items

    // If the link is the same AND it's the first search, don't update dict
    // On the first search, prev and playlist are the same because there wasn't anything before.
    if ((prevPlaylistLink == playlistLink) && !(firstRun) && !(nextPage)) {
        return;
    }

    firstRun = false;

    artistDiv.innerHTML = "";
    artistGenreDiv.innerHTML = "";
    let json;



    // Check if this is a playlist returned by the "next" param
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

    console.log(json)
    console.log(artistDict)

}

async function updateGenreDict() {
    // Loop through each unique artist, add to genreDict
    for (var key in artistDict) {
        let result = await fetch(`https://api.spotify.com/v1/artists/${artistDict[key][0]}`, {
            method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });

        let resultJSON = await result.json()

        if (resultJSON.error) {
            console.log("Artist skipped")
            continue;
        }
        console.log(resultJSON)
        console.log(artistDict[key][0])

        let genres = resultJSON.genres;
        let artist = resultJSON.name;

        // Add genres to artistDict list value, for outputting by # of occurences
        // (could probably combine both dicts but this seems nicer)
        artistDict[artist].push(genres)

        // Adding genres/artists to genreDict
        for (var j = 0; j < genres.length; j++) {

            // Create new key for unique genres
            if (!(genres[j] in genreDict))
                genreDict[genres[j]] = [artist]

            // Add to existing genre key if the artist is not found in it
            // (Artists can have multiple genres? This might not be necessary)
            else if (!(artist in genreDict[genres[j]]))
                genreDict[genres[j]].push(artist)

        }

    }
    // console.log(artistDict)
    //console.log("genreDict formed")
    //console.log(artistDict)
    //console.log(Object.keys(artistDict).length)

    //console.log(genreDict)

    // Update previous link to be this one
    prevPlaylistLink = playlistLink;
}

// Ran on "Show/Hide top artists" press
function toggleRight() {
    if (document.getElementById("hideButton").value == "Show top artists") {
        document.getElementById("rightSide").style.display = "none";
        document.getElementById("hideButton").value = "Hide top artists";
    } else {
        document.getElementById("rightSide").style.display = "inline";
        document.getElementById("hideButton").value = "Show top artists";
    }
}


function updateRight() {

    artistDiv.innerHTML = ""
    artistGenreDiv.innerHTML = ""

    // Output artists by # of occurences
    console.log(playlistJSON)
    document.getElementById('artistTitle').innerHTML = `Artists by occurrences in <i>${playlistName}</i>:`
    let listString = "";

    // Sort artists by # of occurences



    var items = Object.keys(artistDict).map(
        (key) => { return [key, artistDict[key][1]] });

    items.sort(
        (first, second) => { return second[1] - first[1] }
    );

    var keys = items.map(
        (e) => { return e[0] });



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
    document.getElementById('genreTitle').innerHTML = `Artists by Genre in <i>${playlistJSON.name}</i>:`

    for (var key in genreDict) {
        artistGenreDiv.innerHTML += `<p>${key}:<p>\n<ul>`

        // Print list of artists for that genre
        for (var i = 0; i < genreDict[key].length; i++) {
            artistGenreDiv.innerHTML += `<li>${genreDict[key][i]}</li>`
        }

        // Add to artistGenreDiv's HTML a list of each artist/genre
        artistGenreDiv.innerHTML += "</ul>\n<p>&nbsp;</p>";
    }

    // Display right side
    runLoop = false;
    document.getElementById("rightSide").style.display = "inline";
    document.getElementById("search").style.display = "inline";
    document.getElementById("hideButton").style.display = "inline";
}

// Outputs 5 songs matching the genre specified
async function outputSong() {

    // Random genre from dictionary, adapted from https://stackoverflow.com/questions/61042479/how-to-get-a-random-key-value-from-a-javascript-object
    // Separating keys from genreInput is just for readability
    let keys = Object.keys(genreDict);
    let genreInput = keys[Math.floor(Math.random() * keys.length)]

    let artistsOfGenre = genreDict[genreInput]
    let matchingArtist = artistsOfGenre[Math.floor(Math.random() * artistsOfGenre.length)]

    // Convert genre to URL-usable text
    genreInput = genreInput.replace(/\s/g, "+")

    // Get 20 songs matching genre, and pick a random one to show
    const songInfo = await fetchSong(accessToken, `https://api.spotify.com/v1/search?q=tag%3Ahipster+genre%3A"${genreInput}"&type=track&market=US&limit=20&include_external=audio`);
    let randomSongID = songInfo.tracks.items[Math.floor(Math.random() * songInfo.tracks.items.length)].id

    // Display found song w/ details+ embed
    searchDiv.innerHTML = `<h1>Found a song:</h1>\n<p>Genre: <b>${genreInput.replace(/\+/g, " ")}</b>, matching artist: <b>${matchingArtist}</b></p>`;
    searchDiv.innerHTML += `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${randomSongID}?utm_source=generator" height="10%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>                <p>&nbsp;</p>`

}


// Searches for a song given genre
async function fetchSong(token, request) {
    const result = await fetch(request, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}




// From Spotify Web API Template:
// Verifies POST request, returns access token
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





