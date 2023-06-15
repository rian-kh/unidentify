

# Unidentify

A website that finds obscure songs matching the genres of artists in your  **Spotify playlist.**

![image](https://github.com/rian-kh/unidentify/assets/128095876/925b581c-dcab-4e45-9b0c-baa754cce200)


# FAQ

### What are obscure songs?

Obscure songs are the songs returned from searching using **Spotify Web API's** *tag:hipster* parameter, which searches for songs with the lowest 10% popularity.

Note that some songs in **popular** genres (ex. pop, rap) might not be obscure at all...


&nbsp;
&nbsp;

### Why do some of the artists not have genres?

Some artists (especially less-popular/new ones) have not had their genre tags set on Spotify. 

&nbsp;
&nbsp;

### Why doesn't Unidentify use the user's top information instead?

This Spotify API app is on  **Development Mode**, meaning that it can only allow up to 25 users to be authenticated and they have to be specifically registered on the API dashboard. To set the API to  **extended quota mode**  where it can allow more people to be freely authenticated, it must be reviewed and  **hobby projects like these are not allowed to use extended quota mode.**

Instead, this  **main**  branch uses a playlist as input so that user authentication isn't required and anyone can use it. See the **user-auth** branch for how this app would work using user information.

# Limits of the Spotify Web API
- Genres are tied to the **artist**, not the specific song itself.
