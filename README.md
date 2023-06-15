

# Unidentify (w/ User Authentication)

A website that finds obscure songs matching the genre of your **top 50 artists on Spotify.**

![image](https://github.com/rian-kh/unidentify/assets/128095876/9faba926-16d2-412e-95e2-80a2c6ab0155)


# FAQ

### Why is this a separate branch (user-auth)?

This Spotify API app is on **Development Mode**, meaning that it can only allow up to 25 users to be authenticated and they have to be specifically registered on the API dashboard. To set the API to **extended quota mode** where it can allow more people to be freely authenticated, it must be reviewed and **hobby projects like these are not allowed to use extended quota mode.**

Instead, the **main** branch uses a playlist as input so that user authentication isn't required and anyone can use it.

&nbsp;
&nbsp;

### What are obscure songs?

Obscure songs are the songs returned from searching using **Spotify Web API**'s *tag:hipster* parameter.

Note that some songs in **popular** genres (ex. pop, rap) might not be obscure at all...


&nbsp;
&nbsp;

### Why do some of my artists not have genres?

Some artists (especially less-popular/new ones) have not had their genre tags set on Spotify. 

# Limits of the Spotify Web API
- Only the top 50 artists can be returned, nothing more.
- No way to see the amount of plays on your top artists.
- Genres are tied to the **artist**, not the specific song itself.
- Developer Mode only, as stated above.
