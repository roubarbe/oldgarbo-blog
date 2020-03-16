# OLDGARBO, THE BLOG
Documenting the ups and down of working on the oldgarbo project

### So what are you doing?
I'm trying to fetch textual data from an IBM 3270 mainframe, for display on a more modern interface.

### Why are you doing that to yourself?
Well, if I don't do it, no one will.
***

# Monday the 16th of March, 2020 (16/03/2020)
Let's start at the beginning: IBM decided to build upon the TELNET standard to add new features.

### What is TELNET?
It used to be how computers talked to each other remotely. So let's say I start listening to a computer (server) on port 23, that's serving TELNET.

Some TELNET servers will just spew characters as a novelty (see towels.blinkinlight.nl:23 for an ASCII version of Star Wars IV).

Some, more serious, servers will ask you a couple of questions about what you (the client) can do and will do.

## Handshake
Let's see how a normal "handshake" goes through:
```
IAC DO 
```
