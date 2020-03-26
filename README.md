# OLDGARBO, THE BLOG
Documenting the ups and down of working on the oldgarbo project

### So what are you doing?
I'm trying to fetch textual data from an IBM 3270 mainframe, for display on a more modern interface.

### Why are you doing that to yourself?
Well, if I don't do it, no one will.
***

# Wednesday the 25th of March, 2020 (25/03/2020)
So now that we've been able to negociate a connection, the mainframe will just vomit what looks like random characters:

```
uB@@`H$"@e"     @@z@ThtKppAP`H"#@@@@@@@@@@zAdhW$(KB``H"#@Vb@@@@@@@@@@@zBthD&    `qwKwKp@D&      @R@e"   @qwKwKpz@$@Q@rs@pwzpuzrsCp`H"#@A##$@zDDh'xvmvtE@`W"""@@@@@@@@zEThSW~tk@C"~rk@CWd"~qFP`SWAY@U@@@@@@@@@zFdhHEYCdSEbG``D%
@$@@@@@zGthpzppCpHp`b@@@@@@@@zIDhpppAHp`@@@@@@@@@@@@@@@@@@@@@@@@@@@\\\\\\\\\\\\@@@\\\\@@\\\\\@@@@@@@@@@jjJ@`@@@@@@@@@
@@@@@@@@@@@@@@@@@@\\@@@\\@@@\\@@@@\\@@@@\\@@@@@@@@@@@jjjKP`@@@@@@@@@@@@@@@@@@@@@@@@@@@\\@@@\\@@@\\@@@@\\@@@\\@@@@@@@@@
@@jjjjL``@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\\@@@@@@@@@\\@@\\@@@@@@@@@@@jj@jjMp`@@@@@@@@j@@@@@@mkkk```kkm@@@@@@\\@@@@@@@@@
\\@\\@@@@@@@@@@@jj@@jjO@`@iii))@ak}K`}y}@@@@`K@@^`^^k@@@@\\@@@@@@@@@\\\\@@@@@@@@@@@jj@@@jjPP`@@@@@@jkt`@@]@]`kmK@kM@M@@
}}`}@@\\@@@@@@@@@\\\\\@@@@@@@@@jj@@@@jjQ``@@@@@}```}}Mma``}@@y`}]m]@@@@@@@\\@@@@@@@@@\\@@\\@@@@@@@jj@@@@@jj@@@@jjjjjjjj
jjRp`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\\@@@@@@@@@\\@@@\\@@@@@@jjjjjjjjjjj@@d#@pxT@`@@@@@@@@Teb@sKx@@@@@@@@@@@@@\\@@@@@@@
@@\\@@@@\\@@@@@@@@@@@@jjUP`@@@@@c$M(@b("#@@@@@@@@@@@\\@@@@@@@@@\\@@@@@\\@@@@@@@@@@@jjV``@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\
\\\\\@@@@@@\\\\@@@@@\\\@@@@@@@jjjjj
jWp`Y@`@@@@@@@@@@@@cRs@#@(@e@B@@@@@@@%|"KZP`@@@@@@@@@@@@cRt`@$#@(@Q$@f       @@&     |       K)[``@@@@@@@@@@@@@@@@@@@@@"@cRt`KCYEDIcb@@#@    #"o
```

Is it ASCII? It makes no sense!

Oh, no, my child. That's EBCDIC. It's IBM's way of saying "We're the only ones around so suck it" 

###### (there's actually more to this story)[https://en.wikipedia.org/wiki/EBCDIC]

So, if we map it to EBCDIC, we now get:

```
DC1  IGS-Hercules Version  :DC1 MIGSY4.00DC1AIGS-Host name         :DC1AUIGSYPu
ppy.localDC1B-IGS-Host OS           :DC1B4IGSYDarwin-17.7.0 Darwin Kernel Versi
on 17.7.0: Thu Jan 23 07:05:23DC1C0IGS-Host Architecture :DC1DDIGSYx86_64DC1E IGS
-Processors        :DC1EMIGSYLP=4, Cores=2, CPUs=1DC1FIGS-LPAR Name         :
DC1FUIGSYHERCULESDC1G-IGS-Device number     :DC1G4IGSY0:00C0DC1H0IGS-Subchannel
        :DC1IDIGSY000ADC1H0IGS-                           ************   **** 
         *****          ¦¦DC1¢ IGS-                           **   **   **    
         **    **           ¦¦¦DC1.IGS-                           **   **   ** 
            **   **           ¦¦¦¦DC1<-IGS-                                **   
                  **  **           ¦¦ ¦¦DC1(0IGS-        ¦l      _,,,---,,_     
                   **         ** **           ¦¦  ¦¦DC1| IGS- ZZZzz /,'.-'`'    
                   -.  ;-;;,    **         ****           ¦¦   ¦¦DC1IGS-      ¦,
                   4-  ) )-,_. ,( (  ''-'  **         *****         ¦¦    ¦¦DC1J-IGS-
                        '---''(_/--'  `-')_)       **         **  **       ¦¦    
                         ¦¦    ¦¦¦¦¦¦¦¦¦¦DC1K0IGS-                               
                          **         **   **      ¦¦¦¦¦¦¦¦¦¦¦  Update 08DC1M IGS-
                                 The MVS 3.8j             **         **    **    
                                         ¦¦DC1NIGS-     Tur(n)key System         
                                           **         **     **           ¦¦DC1O-IGS-   
```
Wow, well, that looks like... Something ?
See those Weird DC1/IGS things ? Technically they're characters. 

As per EBCDIC: "DC1" is "Device Control 1", usually used to control flow of information (Stop sending data). DC1's decimal number is 17.

"IGS" can ("be used as delimiters to mark fields of data structures.")[https://en.wikipedia.org/wiki/C0_and_C1_control_codes#Field_separators] - And IGS is decimal 29.

You'd think they're for controlling stuff? But why are they part of the characters?

Well, here's the thing. They kinda do, but not.

The vomit the host is shooting back to us is actually 3270 Data Stream. Let's remind ourselves that before monitors, computer scientists used printers. Printer heads can be placed anywhere in a X and Y position. So... we need to position an invisible and intangible printer head? Yes. Yes we do.

Those values (17 and 29) in a 3270 Data Stream context mean the following:

| NAME | Abbreviation | Decimal | Description |
|------|:------------:|:-------:|-------------|
| Start Field | SF | 29 | Indicates the start of a field. Next byte is a field attribute. |
| Set Buffer Address			| SBA	| 0x11	| 17	| Will set where to write data, has two leading bytes to tell location. Can be placed behind any other order. |
Extract from my (Data Stream Cheat Sheet)[https://github.com/roubarbe/oldgarbo/blob/master/dataStream.md]

So we're still dealing with things in binary/decimal?
**Heck yeah we are, because why the heck not, we're in 1985 and the Yamaha DX7 is the leading synth around**

So, now, if we continue parsing through, in binary, and apply all the 3270 Data Stream rules:
```
Hercules Version  :4.00
Host name         :Puppy.local
Host OS           :Darwin-17.7.0 Darwin Kernel Version 17.7.0: Thu Jan 23 07:053
Host Architecture :x86_64
Processors        :LP=4, Cores=2, CPUs=1
LPAR Name         :HERCULES
Device number     :0:00C0
                           ************   ****  *****          ¦¦
                           **   **   **    **    **           ¦¦¦
                           **   **   **    **   **           ¦¦¦¦
                                **         **  **           ¦¦ ¦¦
        ¦l      _,,,---,,_      **         ** **           ¦¦  ¦¦
 ZZZzz /,'.-'`'    -.  ;-;;,    **         ****           ¦¦   ¦¦
      ¦,4-  ) )-,_. ,( (  ''-'  **         *****         ¦¦    ¦¦
     '---''(_/--'  `-')_)       **         **  **       ¦¦     ¦¦    ¦¦¦¦¦¦¦¦¦¦
                                **         **   **      ¦¦¦¦¦¦¦¦¦¦¦  Update 08
       The MVS 3.8j             **         **    **            ¦¦
     Tur(n)key System           **         **     **           ¦¦
                              ******      ****     ***       ¦¦¦¦¦¦

            TK3 created by Volker Bandke       vbandke@bsp-gmbh.com
            TK4- update by Juergen Winkelmann  winkelmann@id.ethz.ch
                     see TK4-.CREDITS for complete credit
```

**_YOU ARE WINNER_**
We were able to read data and make it look OK, and make sense!

Next up: how to interact with the host.

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
You can have more info on TELNET commands and options in lines [414 to 770 of tnLib.js](https://github.com/roubarbe/oldgarbo/blob/master/tnLib.js)

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
