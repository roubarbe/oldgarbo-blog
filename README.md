# OLDGARBO, THE BLOG
Documenting the ups and down of working on the oldgarbo project

### So what are you doing?
I'm trying to fetch textual data from an IBM 3270 mainframe, for display on a more modern interface.

### Why are you doing that to yourself?
Well, if I don't do it, no one will.
***

# Saturday the 21st of March, 2020 (21/03/2020)
Let's start at the beginning: IBM decided to build upon the TELNET standard to add new features.

### What is TELNET?
It used to be how computers talked to each other remotely. So let's say I start listening to a computer (server) on port 23, that's serving TELNET.

Some TELNET servers will just spew characters as a novelty (see towels.blinkinlight.nl:23 for an ASCII version of Star Wars IV).

Some, more serious, servers will ask you a couple of questions about what you (the client) can do and will do.

## Handshake
Let's see how a normal "handshake" goes through:
```
Host:   IAC DO TERMINAL-TYPE
Client: IAC WILL TERMINAL-TYPE
Host:   IAC SB TERMINAL-TYPE ECHO IAC SE
Client: IAC SB TERMINAL-TYPE TRANSMIT-BINARY IBM-3278-2 IAC SE
```
And here's a human-readable version:
```
Host:   Are you going to tell me what kind of terminal you're using.
Client: I will tell you what kind of terminal I'm using
Host:   Alright, tell me what kind of terminal you're using
Client: I am using an IBM-3278-2
```
You can have more info on TELNET commands and options in lines 414 to 770 of tnLib.js

Commands are actually sent as decimals, in a binary blob/buffer.

## Understanding a computer older than you are (ok boomer)
See it as always reminding yourself what you're looking at.

Let's take this line as example:
```
IAC SB TERMINAL-TYPE TRANSMIT-BINARY IBM-3278-2 IAC SE
```

If we consider commands to be level 0, options to be level 1, and binary data not interpreted as TELNET commands/option to be level 3:

```
IAC: "Pay attention to the following stuff" -> Level 0 command, level stays at 0
SB: "We're about to negociate important info" -> Level 0 command, level gets changed to 1
TERMINAL-TYPE: "The name of my terminal is" -> Level 1 command, level stays at 1
TRANSMIT-BINARY: "I will now say it in binary" -> Level 1 command, level gets changed to 3
IBM-3278-2: Each character is sent as a decimal equivalent. Level stays at 3.
```

Once we're done with the binary data, level changed back to 0 and:
```
IAC SE: We're done.
```

## IBM wanted more
At some point, IBM decided to add more stuff to the TELNET specification to enable more features. Blessing in disguise, as the IETF (then RTF) looked at it and went "YUCK, NO" (arguably a good reaction). So they added some stuff, like option 40 (TN3270E), and then IBM could implement their own stuff outside of the specification.

TN3270E commands are described in lines 775 to 888.

### That's all for today. Next one will be: "What kind of binary vomit is this mainframe shooting at me"
