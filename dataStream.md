# The TN3270 data stream

### First Byte

The data stream always begins (first byte) with a command. It can be any of the following:
| Name                  | Hex	| DEC	| DESC |
|:--------------------- |:-----:|:-----:| -------------------------------------------------------------------- |
| Write					| 0xF1	| 241	| Write on screen, starting at a specified location. Always followed (next byte) by a WCC, orders and data.|
| Erase/Write			| 0xF5	| 245	| Empties the display buffer, reset cursor position to 0. Always followed (next byte) by a WCC, orders and data.|
| Erase/Write Alt		| 0x7E	| 126	| Never followed by anything |
| Read Buffer			| 0xF2	| 242	| Never followed by anything |
| Read Modified			| 0xF6	| 246	| Never followed by anything |
| Read Modified All		| 0x6E	| 110	| Never followed by anything |
| Erase All Unprotected	| 0x6F	| 111	| Will clear all unprotected fields |
| Write Structured Field | 0xF3	| 243	| Set of instructions (structured fields) |

### Second Byte
The next byte is the WCC (Write Control Character). This provides some parameters to the 
previously specified command. Unlike the first byte which is just a value, this byte is read 
bit by bit. This includes instructions such as "ringing a bell" (beep!), printing, and unlocking
keyboard actions. For now, OldGarbo will ignore the WCC.

### Third Byte
The next byte comprises of Orders. Orders can be anywhere, not just as a third byte.
They are one byte each.

## Orders
Orders can be any of the following:

| NAME							| ABBRV	| HEX	| DEC	| DESC								|
|:----------------------------- |:-----:|:-----:|:-----:| --------------------------------- |
| Start Field					| SF	| 0x1D	| 29	| Indicates the start of a field. Next byte is a field attribute. |
| Start Field Extended			| SFE	| 0x29	| 41	| Indicates the start of a field. Followed by additional information: <ul><li>Number of Attribute Value-Pairs</li><li>Attribute Type</li><li>Attribute Value</li></ul>So by that logic: <br> ```SFE 2 3270 Value Color Red``` <br>Means default character set and red color<br>If number of value-pairs is 0, set to defaults. |
| Set Buffer Address			| SBA	| 0x11	| 17	| Will set where to write data, has two leading bytes to tell location. Can be placed behind any other order.<br>The leading bytes are read in binary.<br>If the first two bits of the first byte are 01 or 11:<br>Join the last 6 bits of both bytes to form a buffer position (ex: character 48 out of 1920). Effectively making a 12-bit address.<br>So<br>01000011 +<br>01000110 =<br>000011000110 (198)<br>If the first two bits of the first byte are 00:<br>Take the remaining bits of this byte and add them to the following byte, making a 14 bit address |
| Set Attribute					| SA	| 0x28	| 40	| Specifies the next characters attributes until:<br><ul><li>A new SA changes the attributes</li><li>Another write command is sent</li><li>CLEAR is pressed</li><li>You turn off your terminal</li></ul>Can be used to specify charset, color, highlight, blink status |
| Modify Field					| MF	| 0x2C	| 44	| Starts modifying fields and their attributes at the current buffer address. After update, buffer address is incremented. Is followed by:<ul><li>Number of Attribute Value-Pairs</li><li>Attribute Type</li><li>Attribute Value</li></ul>Unspecified attributes are unchanged. |
| Insert Cursor					| IC	| 0x13	| 19	| Changes cursor position			|
| Program Tab					| PT	| 0x05	| 05	| Advances buffer to next unprotected field |
| Repeat To Address				| RA	| 0x3C	| 60	|Repeats a character until specified buffer address reached. Address is in two bytes, then following byte is the character to be repeated. |
| Erase Unprotected To Address	|EUA	| 0x12	| 18	| Clears buffer until address reached. Address is in two bytes. |
| Graphic Escape				| GE	| 0x08	| 08	| Inserts a graphic character from an alternate charset |


The following orders are stored in the character buffer and are as follows:
| ORDER		| HEX	| DEC	| DESC								 |
|:--------- |:-----:|:-----:|------------------------------------|
| NUL		| 0x00	| 00	| Blank, suppressed on Read Modified |
| SUB		| 0x3F	| 63	| A solid circle					 |
| DUP		| 0x1C	| 28	| An overscore asterisk				 |
| FM		| 0x1E	| 30	| An overscore semicolon			 |
| FF		| 0x0C	| 12	| Blank								 |
| CR		| 0x0D	| 13	| Blank								 |
| NL		| 0x15	| 21	| Blank								 |
| EM		| 0x19	| 25	| Blank								 |
| EO		| 0xFF	| 255	| Blank								 |


## Attributes:

### Character Attributes
Character attributes are defined as a type-value pair.

| HEX	| DEC	| DESC												|
|:-----:|:-----:|---------------------------------------------------|
| 0x00	| 00	| All attributes									|
| 0xC0	| 192	| 3270 Field Attribute								|
| 0xC1	| 193	| Field Validation<br>Values:<table><tr><th>BIT</th><th>SETTING</th><th>PROPERTY</th></tr><tr><td>0-4</td><td>'0000'</td><td>Reserved, must be zero</td></tr><tr><td>5</td><td>'1'</td><td>Mandatory Fill</td></tr><tr><td>6</td><td>'1'</td><td>Mandatory Entry</td></tr><tr><td>7</td><td>'1'</td><td>Trigger</td></tr></table> |
| 0xC2	| 194	| Field Outlining									|
| 0x41	| 65	| Extended Highlighting<br>Values:<table><tr><th>HEX</th><th>DEC</th><th>PROPERTY</th></tr><tr><td>0x00</td><td>00</td><td>Default</td></tr><tr><td>0xF0</td><td>240</td><td>Normal</td></tr><tr><td>0xF1</td><td>241</td><td>Blink</td></tr><tr><td>0xF2</td><td>242</td><td>Reverse</td></tr><tr><td>0xF4</td><td>244</td><td>Underscore</td></tr></table>	|
| 0x42	| 66	| Foreground Color<br>Values:<table><tr><th>HEX</th><th>DEC</th><th>PROPERTY</th></tr><tr><td>0x00</td><td>00</td><td>Default Color</td></tr><tr><td>0xF7</td><td>247</td><td>Neutral</td></tr></table> |
| 0x43	| 67	| Character set										|
| 0x45	| 69	| Background Color									|
| 0x46	| 70	| Transparency<br>Values:<table><tr><th>HEX</th><th>DEC</th><th>PROPERTY</th></tr><tr><td>0x00</td><td>00</td><td>Default</td></tr><tr><td>0xF0</td><td>240</td><td>Background is transparent (OR)</td></tr><tr><td>0xF1</td><td>241</td><td>Background is transparent (XOR)</td></tr><tr><td>0xFF</td><td>255</td><td>Background is opaque</td></tr></table> |

### Field Attributes
Field attributes are defined in a byte, with the following bits:
| BIT	| DESC											|
|:-----:|-----------------------------------------------|
| 0&1	| Is a graphic EBCDIC character					|
| 2		| Unprotected or protected						|
| 3		| Alphanumeric or Numeric-only					|
| 4&5	|<ul><li>00: Display/Not-Selector-Pen-Detectable</li><li>01: Display/Selector-Pen-Detectable</li><li>10: Intensified Display/Selector-Pen-Detectable</li><li>11: Nondisplay/nondetectable</li></ul> |
| 6		| Reserved, must always be 0					|
| 7		| Was modified									|

Field attributes are present in the buffer, but displayed as space, and can't
be modified.