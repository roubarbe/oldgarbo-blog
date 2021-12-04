const config = require('./config')
const tnLib = {
	
	// Display object contains the buffer array and its methods
	display:{
		buffer: [],
		
		/**
		 * Initializes the display buffer with the config's specified rows and columns length
		 */
		initBuffer: () => {
			tnLib.display.buffer = new Array(config.rows);

			for(let i = 0; i < tnLib.display.buffer.length; i++){
				tnLib.display.buffer[i] = new Array(config.columns)
				// Object.seal(tnLib.display.buffer[i]);
			}

			// Object.seal will make the buffer array's length static
			// Object.seal(tnLib.display.buffer);

			tnLib.display.currentAddress = [0,0];

		},

		/**
		 * Clears all data from the buffer array
		 */
		clearBuffer: () => {
			for(let i = 0; i < tnLib.display.buffer.length; i++){
				for(let e = 0; e < tnLib.display.buffer[i].length; e++){
					tnLib.display.buffer[i][e] = undefined;
				}
			}
			// console.log("buffer cleared");
		},


		/**
		 * Console logs all rows in the display buffer.
		 */
		printBuffer: () => {
			for(let i = 0; i < tnLib.display.buffer.length; i++){
				console.log(tnLib.display.buffer[i].join(""));
			}
		},

		/* getAddress: () => {

		}, */

		setAddressFromIndex: (address) => {
			// console.log(address);
			tnLib.display.currentAddress = tnLib.display.convertIndexToMatrix(address);
			// console.log(tnLib.display.currentAddress);
		},

		/**
		 * Converts a decimal address into a matrix array representing the position in the buffer array
		 * @param {number} address Address in decimal
		 * @returns {array} the equivalant array position
		 */
		convertIndexToMatrix: (address) => {
			let totalChars = config.rows * config.columns;
			let row = 0;
			let column = 0;
			if(address < totalChars){
				/* row = Math.floor(address / config.rows);
				column = address % config.columns; */

				for(let i = 0; i < address; i++){
					column = column + 1;
					if(column == 80){
						column = 0;
						row = row + 1;
					}
				}
				// console.log(row, column);
				return [row, column];
			}
			else{
				return [24,80];
			}
		},


		/**
		 * Converts an X,Y matrix into an index
		 * @param {array} matrix Address as an X,Y array
		 * @returns {number} the equivalant index position
		 */
		convertMatrixToIndex: (matrix) => {
			return matrix[0]*matrix[1];
		},


		incrementAddress: () => {
			let currentAddress = tnLib.display.currentAddress;
			if(currentAddress[1] == config.columns){
				if(currentAddress[0] < config.rows){
					/* currentAddress[0] = currentAddress[0] + 1;
					currentAddress[1] = 0; */
					// console.log("new line");
					currentAddress[1] = config.columns;
				}
			}
			else{
				currentAddress[1] = currentAddress[1] + 1;

			}

			tnLib.display.currentAddress = currentAddress;
		},


		writeChar: (char) => {
			let currentAddress = tnLib.display.currentAddress;
			// console.log(tnLib.display.buffer[currentAddress[0]][currentAddress[1]]);
			// console.log(currentAddress, char);
			tnLib.display.buffer[currentAddress[0]][currentAddress[1]] = char;
			tnLib.display.incrementAddress();
		},

		currentAddress: [0,0]
	},

	translation:{
		/**
		 * Will search through the "telnet" object for the specified key value, and will return an array containing equivalant strings.
		 * @param {buffer} data 
		 * @returns the translated version, as an array containing strings.
		 */
		fromBuffer: (data) => {
			let returnArray = [];
			let deviceName = false;
			if(Buffer.isBuffer(data)){
				// let's default to TELNET commands
				let currentState = 0;
				let subNegEnd = [];
				if(data[data.length - 2] == 255 && data[data.length - 1] == 240){
					subNegEnd = ["IAC","SE"];
					let bufSlice = data.slice(data.length-2);
					data = data.slice(0, data.length - 2);
				}
				// console.log(data[data.length - 2]);
				for(let i = 0; i < data.length; i++){
					console.log(data[i], currentState);
					/*
						Type definition for states:
							0:	TELNET command
							1:	TELNET option
							2:	TN3270E command
							3:	TN3270E Reason Code
							4:	TN3270E Function Name
							5: 	Default - ASCII character
					*/
					let translated = "";
					switch(currentState){
						case 0:
							// console.log(data[i]);
							translated = tnLib.fetchInLib(data[i], 0);
							returnArray.push(translated);
							if(data[i] == 254 || data[i] == 253 || data[i] == 252 || data[i] == 251 || data[i] == 250){
								currentState = 1;
							}
							break;
						case 1:
							translated = tnLib.fetchInLib(data[i], 1);
							returnArray.push(translated);
							if(data[i] == 1){
								currentState = 0;
							}
							else if(data[i] == 0){
								if(data[i+1] != 255){
									currentState = 5;
								}
								else{
									currentState = 0;
								}
								// console.log("prepare for binary");
								// currentState = 0;
							}
							else if(data[i] ==  25){
								currentState = 0;
							}
							else if(data[i] == 40){
								currentState = 2;
							}
							break;
						case 2:
							translated = tnLib.fetchInLib(data[i], 2);
							returnArray.push(translated);

							if(data[i] == 4){
								if(data[i-1] == 3){
									currentState = 3;
								}
								else{
									currentState = 5;
								}
								
							}
							else if(data[i] == 1){
								currentState = 5;
								deviceName = true;
							}
							break;
						case 3:
							break;
						case 4:
							break;
						default:
							// console.log("BINARY");
							let convertedString = tnLib.fetchInLib(data[i], 5);
							returnArray.push(convertedString);
							if(deviceName){
								config.deviceName += convertedString;
							}
							// currentState = 2;
							if(data[i+1] == 1){
								currentState = 2;
								deviceName = false;
							}
					}
				}

				if(subNegEnd.length > 0){
					// console.log(returnArray, subNegEnd);
					returnArray = returnArray.concat(subNegEnd);
				}
				// console.log(returnArray);
				return returnArray;
				
			}
			else{
				return [];
			}
		},

		/**
		 * Will search through the "telnet" object for the specified key value, and will return its equivalant in a buffer.
		 * @param {buffer} data 
		 * @returns the translated version, as a buffer.
		 */
		toBuffer: (data) => {
			let returnArray = [];
			if(Array.isArray(data)){
				// let's default to TELNET commands
				let currentState = 0;
				// console.log(data);

				let subNegEnd = [];
				// console.log(data[data.length-2], data[data.length-1]);
				if(data[data.length - 2] == "IAC" && data[data.length - 1] == "SE"){
					// console.log(data, "match");
					subNegEnd = [255, 240];
					data.splice(-2,2);
					// console.log(data, subNegEnd);
					
				}

				for(let i = 0; i < data.length; i++){
					// console.log(data[i], currentState);
					/*
						Type definition for states:
							0:	TELNET command
							1:	TELNET option
							2:	TN3270E command
							3:	TN3270E Reason Code
							4:	TN3270E Function Name
							5: 	Default - ASCII character
					*/
					let translated = "";
					switch(currentState){
						case 0:
							// console.log(data[i]);
							translated = tnLib.fetchInLib(data[i], 0);
							returnArray.push(translated);
							if(data[i] == "DO" || data[i] == "DONT" || data[i] == "WILL" || data[i] == "WONT" || data[i] == "SB"){
								currentState = 1;
							}
							break;
						case 1:
							translated = tnLib.fetchInLib(data[i], 1);
							returnArray.push(translated);
							if(data[i] == "ECHO"){
								currentState = 0;
							}
							else if(data[i] == "TRANSMIT-BINARY"){
								if(data[i+1] != "IAC"){
									currentState = 5;
								}
								else{
									currentState = 0;
								}
							}
							else if(data[i] == "EOR"){
								currentState = 0;
							}
							else if(data[i] == "TN3270E"){
								currentState = 2;
							}
							break;
						case 2:
							translated = tnLib.fetchInLib(data[i], 2);
							returnArray.push(translated);

							if(data[i] == "REQUEST"){
								if(data[i-1] == "FUNCTIONS"){
									currentState = 4;
								}
								else{
									currentState = 5;
								}
							}

							else if(data[i] == "IS"){
								currentState = 5;
							}

							else if(data[i] == "CONNECT"){
								currentState = 5;
							}

							
							break;
						case 3:
							break;
						case 4:
							break;
						default:
							// console.log(currentState);
							// console.log("transmitting binary data now:", data[i]);
							for(let e = 0; e < data[i].length; e++){
								// console.log(data[i][e]);
								let convertedString = tnLib.fetchInLib(data[i][e], 5);
								// console.log(convertedString);
								returnArray.push(convertedString);
								// console.log(returnArray);
							}
							currentState = 0;
					}
				}

				if(subNegEnd.length > 0){
					returnArray = returnArray.concat(subNegEnd);
				}
				// console.log(returnArray);
				return Buffer.from(returnArray);
				
			}
			else{
				return [];
			}
		}
	},

	/**
	 * Seeks through the telnet lib and returns the specified thing either as decimal or string
	 * @param {*} decOrString The TELNET command/option
	 * @param {number} whatIsIt Specifies if normal Telnet Option/Command, or else.
	 * @returns {*} What it could find in the library
	 */
	fetchInLib: (decOrString, whatIsIt) => {
		// console.log(whatIsIt);
		// If we haven't defined whatIsIt
		if(typeof whatIsIt === undefined){
			
		}
		// whatIsIt must be a number
		else if(typeof whatIsIt != "Number"){

		}

		// If we haven't defined decOrString
		if(typeof decOrString === undefined){

		}

		/*
			Type definition for whatIsIt:
				0:	TELNET command
				1:	TELNET option
				2:	TN3270E command
				3:	TN3270E Reason Code
				4:	TN3270E Function Name
				5: 	Default - ASCII character
		*/
		let returnedValue;
		switch(whatIsIt){
			case 0:
				// console.log(typeof decOrString);
				if(typeof decOrString === "string"){
					returnedValue = tnLib.telnet.lib.commands.find(element => element.name === decOrString).decimal;
				}
				else{
					returnedValue = tnLib.telnet.lib.commands.find(element => element.decimal === decOrString).name;
					// console.log(returnedValue);
				}
				break;
			case 1:
				if(typeof decOrString === "string"){
					returnedValue = tnLib.telnet.lib.options.find(element => element.name === decOrString).decimal;
				}
				else{
					returnedValue = tnLib.telnet.lib.options.find(element => element.decimal === decOrString).name;
				}
				break;
			case 2:
				// console.log(decOrString, whatIsIt);
				if(typeof decOrString === "string"){
					returnedValue = tnLib.telnet.lib.tn3270e.commands.find(element => element.name === decOrString).decimal;
				}
				else{
					returnedValue = tnLib.telnet.lib.tn3270e.commands.find(element => element.decimal === decOrString).name;
				}
				// console.log(returnedValue);
				break;
			case 3:
				if(typeof decOrString === "string"){
					returnedValue = tnLib.telnet.lib.tn3270e.reasonCodes.find(element => element.name === decOrString).decimal;
				}
				else{
					returnedValue = tnLib.telnet.lib.tn3270e.reasonCodes.find(element => element.decimal === decOrString).name;
				}
				break;
			case 4:
				if(typeof decOrString === "string"){
					returnedValue = tnLib.telnet.lib.tn3270e.functionNames.find(element => element.name === decOrString).decimal;
				}
				else{
					returnedValue = tnLib.telnet.lib.tn3270e.functionNames.find(element => element.decimal === decOrString).name;
				}
				break;
			default:
				if(typeof decOrString === "string"){
					returnedValue = Number(decOrString.charCodeAt(0));
				}
				else{
					returnedValue = String.fromCharCode(decOrString);
				}
		}

		// If for some reason "returnedValue doesn't get a value, we assign it 0 as a string"
		if(typeof returnedValue == undefined){
			returnedValue = "0";
		}
		// console.log(returnedValue);
		return returnedValue;
	},

	telnet:{
		lib:{
			commands:[
				{
					"name":"IAC",
					"desc":"Interpret As Command",
					"decimal": 255
				},
				{
					"name":"DONT",
					"desc": "Stop/Not performing a specific option",
					"decimal": 254
				},
				{
					"name":"DO",
					"desc": "Performing a specific option",
					"decimal": 253
				},
				{
					"name":"WONT",
					"desc": "Refusing to perform a specific option",
					"decimal": 252
				},
				{
					"name":"WILL",
					"desc": "Desire to begin/Confirm a specific option",
					"decimal": 251
				},
				{
					"name":"SB",
					"desc": "Subnegotiation of the following options",
					"decimal": 250
				},
				{
					"name":"GA",
					"desc": "Go Ahead, it's your turn now",
					"decimal": 249
				},
				{
					"name":"EL",
					"desc": "Erase line, deletes all the previous characters until the last carriage return and line feed (CRLF)",
					"decimal": 248
				},
				{
					"name":"EC",
					"desc": "Erase character, deletes the last entered character",
					"decimal": 247
				},
				{
					"name":"AYT",
					"desc": "Are You There? Keep Alive",
					"decimal": 246
				},
				{
					"name":"AO",
					"desc": "Abort Output. Flush the screen",
					"decimal": 245
				},
				{
					"name":"IP",
					"desc": "Suspend, Interrupt or abort the process",
					"decimal": 244
				},
				{
					"name":"BRK",
					"desc": "Break. The BRK or ATTN key was hit",
					"decimal": 243
				},
				{
					"name":"DM",
					"desc": "Data Mark. Position of Synch Event, always accompany with TCP Urgent notification",
					"decimal": 242
				},
				{
					"name":"NOP",
					"desc": "No Operation",
					"decimal": 241
				},
				{
					"name":"SE",
					"desc": "Subnegociations End, end of subnegociations parameters",
					"decimal": 240
				},
				{
					"name":"EOR",
					"desc": "End Of Records, end of data transmission",
					"decimal": 239
				}
			],
			options:[
				{
					"name":"EXOPL",
					"desc": "Extended-Options-List: future options that can't fit between 0 to 255.",
					"decimal": 255
				},
				{
					"name":"PRAGMA_HEARTBEAT",
					"desc": "NOT AN IETF STANDARD",
					"decimal": 140
				},
				{
					"name":"SSPI_LOGON",
					"desc": "NOT AN IETF STANDARD",
					"decimal": 139
				},
				{
					"name":"PRAGMA_LOGON",
					"desc": "NOT AN IETF STANDARD",
					"decimal": 138
				},
				{
					"name":"FORWARD_X",
					"desc": "Forward X Window information",
					"decimal": 49
				},
				{
					"name":"SEND_URL",
					"desc": "Exchange URL information",
					"decimal": 48
				},
				{
					"name":"KERMIT",
					"desc": "KERMIT file protocol",
					"decimal": 47
				},
				{
					"name":"START_TLS",
					"desc": "Activate TLS encryption",
					"decimal": 46
				},
				{
					"name":"SLE",
					"desc": "SUPPRESS-LOCAL-ECHO: Won't echo locally input characters",
					"decimal": 45
				},
				{
					"name":"COM_PORT_OPTION",
					"desc": "Negociation modem options",
					"decimal": 44
				},
				{
					"name":"RSP",
					"desc": "Remote Serial Port: Set up a listener on a COM port",
					"decimal": 43
				},
				{
					"name":"CHARSET",
					"desc": "Which charset to use",
					"decimal": 42
				},
				{
					"name":"XAUTH",
					"desc": "NOT AN IETF STANDARD",
					"decimal": 41
				},
				{
					"name":"TN3270E",
					"desc": "Protocol type TN3270E",
					"decimal": 40
				},
				{
					"name":"NEW_ENVIRON",
					"desc": "Pass environment information",
					"decimal": 39
				},
				{
					"name":"ENCRYPT",
					"desc": "Supports encryption",
					"decimal": 38
				},
				{
					"name":"AUTHENTICATION",
					"desc": "Lets the client and server negotiate a method of authentication to secure connections.",
					"decimal": 37
				},
				{
					"name":"ENVIRON",
					"desc": "Pass environment information",
					"decimal": 36
				},
				{
					"name":"X_DISPLAY_LOCATION",
					"desc": "Send the X Display window location",
					"decimal": 35
				},
				{
					"name":"LINEMODE",
					"desc": "Allows the client to send data one line at a time instead of one character at a time",
					"decimal": 34
				},
				{
					"name":"TOGGLE-FLOW-CONTROL",
					"desc": "Allows flow control between the client and the server to be enabled and disabled.",
					"decimal": 33
				},
				{
					"name":"TERMINAL-SPEED",
					"desc": "Allows devices to report on the current terminal speed.",
					"decimal": 32
				},
				{
					"name":"NAWS",
					"desc": "Permits communication of the size of the terminal window.",
					"decimal": 31
				},
				{
					"name":"X3_PAD",
					"desc": "Pre-process characters",
					"decimal": 30
				},
				{
					"name":"REGIME_3270",
					"desc": "Support 3270 Data Stream on Telnet",
					"decimal": 29
				},
				{
					"name":"TTYLOC",
					"desc": "Terminal location.",
					"decimal": 28
				},
				{
					"name":"OUTMRK",
					"desc": "Output Marking: The host sends a banner to display on the terminal.",
					"decimal": 27
				},
				{
					"name":"TUID",
					"desc": "TelNet User Identification",
					"decimal": 26
				},
				{
					"name":"EOR",
					"desc": "End Of Records. Data entry is finished.",
					"decimal": 25
				},
				{
					"name":"TERMINAL-TYPE",
					"desc": "Allows the client and server to negotiate the use of a specific terminal type.",
					"decimal": 24
				},
				{
					"name":"SEND_LOCATION",
					"desc":"Send the user's location using NAME/FINGER protocol",
					"decimal": 23
				},
				{
					"name":"SUPDUP_OUTPUT",
					"desc":"Use another user as display",
					"decimal": 22
				},
				{
					"name":"SUPDUP",
					"desc":"Use another user as display",
					"decimal": 21
				},
				{
					"name":"DET",
					"desc":"Send and receive subcommands to control the Data Entry Terminal.",
					"decimal": 20
				},
				{
					"name":"BM",
					"desc":"Does not mean \"Body Massage\". Byte Macro. Send single data characters which are to be interpreted as if replacement data strings had been sent.",
					"decimal": 19
				},
				{
					"name":"LOGOUT",
					"desc":"Force Log Out",
					"decimal": 18
				},
				{
					"name":"EXTEND-ASCII",
					"desc": "Lets devices agree to use extended ASCII for transmissions and negotiate how it will be used.",
					"decimal": 17
				},
				{
					"name":"NAOLFD",
					"desc": "Allows devices to decide how line feed characters should be handled.",
					"decimal": 16
				},
				{
					"name":"NAOVTD",
					"desc": "Lets devices negotiation the disposition of vertical tab stops.",
					"decimal": 15
				},
				{
					"name":"NAOVTS",
					"desc": "Used to determine what vertical tab stop positions will be used for output display.",
					"decimal": 14
				},
				{
					"name":"NAOFFD",
					"desc": "Allows the devices to negotiation how form feed characters will be handled.",
					"decimal": 13
				},
				{
					"name":"NAOHTD",
					"desc": "Allows the devices to negotiation how horizontal tabs will be handled and by which end of the connection.",
					"decimal": 12
				},
				{
					"name":"NAOHTS",
					"desc": "Allows the devices to determine what horizontal tab stop positions will be used for output display.",
					"decimal": 11
				},
				{
					"name":"NAOCRD",
					"desc": "Lets the devices negotiate how carriage returns will be handled.",
					"decimal": 10
				},
				{
					"name":"NAOP",
					"desc": "Negotiate Output Page Size",
					"decimal": 9
				},
				{
					"name":"NAOL",
					"desc": "Negotiate Output Line Width",
					"decimal": 8
				},
				{
					"name":"RCTE",
					"desc": "Remote Controlled Trans and Echo",
					"decimal": 7
				},
				{
					"name":"TIMING-MARK",
					"desc": "Allows devices to negotiate the insertion of a special timing mark into the data stream, which is used for synchronization.",
					"decimal": 6
				},
				{
					"name":"STATUS",
					"desc": "Lets a device request the status of a Telnet option.",
					"decimal": 5
				},
				{
					"name":"AMSN",
					"desc": "Approximate Message Size Negociations",
					"decimal": 4
				},
				{
					"name":"SUPPRESS-GO-AHEAD",
					"desc": "Allows devices not operating in half-duplex mode to no longer need to end transmissions using the Telnet Go Ahead command.",
					"decimal": 3
				},
				{
					"name":"RECONNECT",
					"desc": "Launches the reconnect process",
					"decimal": 2
				},
				{
					"name":"ECHO",
					"desc": "Output entered text.",
					"decimal": 1
				},
				{
					"name":"TRANSMIT-BINARY",
					"desc": "Allows devices to send data in 8-bit binary form instead of 7-bit ASCII.",
					"decimal": 0
				}
			],
			tn3270e:{
				commands:[
					{
						"name":"SEND",
						"desc": "Give me the information.",
						"decimal": 8
					},
					{
						"name":"REQUEST",
						"desc": "Requesting a specific resource",
						"decimal": 7
					},
					{
						"name":"REJECT",
						"desc": "Negociations rejected",
						"decimal": 6
					},
					{
						"name":"REASON",
						"desc": "Reason for rejection or association, etc.",
						"decimal": 5
					},
					{
						"name":"IS",
						"desc": "Specify a resource.",
						"decimal": 4
					},
					{
						"name":"FUNCTIONS",
						"desc": "This command is used to suggest a set of 3270 functions that will be supported on this session.",
						"decimal": 3
					},
					{
						"name":"DEVICE-TYPE",
						"desc": "Device-Type negociations",
						"decimal": 2
					},
					{
						"name":"CONNECT",
						"desc": "CONNECT to the device-type, or device-name specified",
						"decimal": 1
					},
					{
						"name":"ASSOCIATE",
						"desc": "This allows clients to associate a printer session with a terminal rather than having to have prior knowledge of a printer device-name.",
						"decimal": 0
					}
				],
				reasonCodes:[
					{
						"name":"UNSUPPORTED-REQ",
						"desc": "The server is unable to satisfy the type of request sent by the client; e.g., a specific terminal or printer was requested but the server does not have any such pools of device-names defined to it, or the ASSOCIATE command was used but no partner printers are defined to the server.",
						"decimal": 7
					},
					{
						"name":"UNKNOWN-ERROR",
						"desc": "Any other error in device type or name processing has occurred.",
						"decimal": 6
					},
					{
						"name":"TYPE-NAME-ERROR",
						"desc": "The requested device-name or resource-name is incompatible with the requested device-type (such as terminal/printer mismatch).",
						"decimal": 5
					},
					{
						"name":"INV-DEVICE-TYPE",
						"desc": "Invalid Device Type: The server does not support the requested device-type.",
						"decimal": 4
					},
					{
						"name":"INV-NAME",
						"desc": "Invalid Name: The resource-name or device-name specified in the CONNECT or ASSOCIATE command is not known to the server.",
						"decimal": 3
					},
					{
						"name":"INV-ASSOCIATE",
						"desc": "Invalid Associate: The client used the ASSOCIATE command and either the device-type is not a printer or the device-name is not a terminal.",
						"decimal": 2
					},
					{
						"name":"DEVICE-IN-USE",
						"desc": "The requested device-name is already associated with another session.",
						"decimal": 1
					},
					{
						"name":"CONN-PARTNER",
						"desc": "The client used the CONNECT command to request a specific printer but the device-name requested is the partner to some terminal.",
						"decimal": 0
					}
				],

				functionNames:[
					{
						"name":"SYSREQ",
						"desc": "Allows the client and server to emulate some (or all, depending on the server) of the functions of the SYSREQ key in an SNA environment.",
						"decimal": 4
					},
					{
						"name":"SCS-CTL-CODES",
						"desc": "(Printer sessions only). Allows the use of the SNA Character Stream (SCS) and SCS control codes on the session. SCS is used with LU type 1 SNA sessions.",
						"decimal": 3
					},
					{
						"name":"RESPONSES",
						"desc": "Provides support for positive and negative response handling. Allows the server to reflect to the client any and all definite, exception, and no response requests sent by the host application.",
						"decimal": 2
					},
					{
						"name":"DATA-STREAM-CTL",
						"desc": "(Printer sessions only). Allows the use of the standard 3270 data stream. This corresponds to LU type 3 SNA sessions.",
						"decimal": 1
					},
					{
						"name":"BIND-IMAGE",
						"desc": "Allows the server to send the SNA Bind image and Unbind notification to the client.",
						"decimal": 0
					}
				]
			}
		}
	},

    handshake:{
        doTN3270e:				["IAC","DO","TN3270E"],
        willTN3270e:			["IAC","WILL","TN3270E"],
		sbSendDeviceType:		["IAC","SB","TN3270E","SEND","DEVICE-TYPE","IAC","SE"],
		sbSendDeviceTypeReq:	["IAC","SB","TN3270E","DEVICE-TYPE","REQUEST",config.model,"IAC","SE"],
		doTerminalType:			["IAC","DO","TERMINAL-TYPE"],
		willTerminalType:		["IAC","WILL","TERMINAL-TYPE"],
		terminalType:			["IAC","TERMINAL-TYPE"],
		sbTerminalTypeEcho: 	['IAC','SB','TERMINAL-TYPE','ECHO','IAC','SE'],
		sbTerminalType:			["IAC","SB","TERMINAL-TYPE","TRANSMIT-BINARY",config.model,"IAC","SE"],
		doEorWillEor:			['IAC','DO','EOR','IAC','WILL','EOR'],
		willEorDoEor:			['IAC','WILL','EOR','IAC','DO','EOR'],
		doBinWillBin:			['IAC','DO','TRANSMIT-BINARY','IAC','WILL','TRANSMIT-BINARY'],
		willBinDoBin:			['IAC','WILL','TRANSMIT-BINARY','IAC','DO','TRANSMIT-BINARY'],
		deviceNameConnect:		["IAC","SB","TN3270E","CONNECT",config.deviceName,"IAC","SE"],
		functionsRequest:		["IAC","SB","TN3270E","FUNCTIONS","REQUEST", "BIND-IMAGE", "DATA-STREAM-CTL", "RESPONSES", "SCS-CTL-CODES", "SYSREQ","IAC","SE"],


		
		/**
		 * Compares two arrays, and returns true if they're the same, false if not
		 * @param {array} array0 
		 * @param {array} array1 
		 * @returns {boolean} If the arrays are similar
		 */
		arrayComparator: function(array0, array1){
            if(array0.length === array1.length){
                let similarValues = 0;
                for(let i=0; i < array0.length; i++){
                    if(array0[i] === array1[i]){
                        similarValues = similarValues + 1;
                    }
                }

                if(similarValues === array0.length){
                    return true;
                }
                else{
                    return false;
                }
            }
        },

        /**
         * Takes an array and returns an array of numbers
         * @param {Buffer} buff Buffer passed to this function
         * @returns {array} Array containing all bytes of the passed buffer, as decimal numbers
         */
        convertBufferToArray: function(buff){
            let arrayFromBuffer = [];
            for(let i=0; i < buff.length; i++){
                arrayFromBuffer.push(Number(buff[i]));
            }
            return arrayFromBuffer;
		},
		

		/**
		 * Each "IAC" makes for a new array
		 * @param {array} whatDidTheServerSay 
		 * @returns arrayOfIACs
		 */
		divideIntoIACs: function(whatDidTheServerSay){
			let arrayOfIACs = [];
			let tempArray = [];
			for(let i = 0; i < whatDidTheServerSay.length; i++){
				if(whatDidTheServerSay[i] == "IAC"){
					if(i > 0){
						arrayOfIACs.push(tempArray);
						tempArray = [];
					}
				}
				tempArray.push(whatDidTheServerSay[i]);
				if(i == whatDidTheServerSay.length - 1){
					arrayOfIACs.push(tempArray);
				}
			}
			return arrayOfIACs;
		}
    },
    convertBuffer:{
        from3270DataStream: function(buff){
			let arrayFromBuffer = Uint8Array.from(buff);
			let translatedArray = []
			
			// The Data Stream always ends with IAC EOR, to delimit the end of the stream. So we'll remove that for now, and place it back in after processing.
			let endOfRecords = [];
			if(arrayFromBuffer[arrayFromBuffer.length-2] == 255 && arrayFromBuffer[arrayFromBuffer.length-1] == 239){
				endOfRecords = ["IAC","EOR"];
				arrayFromBuffer = arrayFromBuffer.slice(0, arrayFromBuffer.length-2);
				// console.log(endOfRecords);
			}

			/*	
				The data stream always begins (first byte) with a command. It can be any of the following:
				------------------------------------------------------------------------------------------------
				[NAME]					[HEX]	[DEC]	[DESC]
				Write					0xF1	241		Write on screen, starting at a specified location.
														Always followed (next byte) by a WCC, orders and data.

				Erase/Write				0xF5	245		Empties the display buffer, reset cursor position to 0
														Always followed (next byte) by a WCC, orders and data.

				Erase/Write Alt			0x7E	126		Never followed by anything
				Read Buffer				0xF2	242		Never followed by anything
				Read Modified			0xF6	246		Never followed by anything
				Read Modified All		0x6E	110		Never followed by anything
				Erase All Unprotected	0x6F	111		Will clear all unprotected fields
				Write Structured Field	0xF3	243		Set of instructions (structured fields)
				------------------------------------------------------------------------------------------------
				
				The next byte is the WCC (Write Control Character). This provides some parameters to the 
				previously specified command. Unlike the first byte which is just a value, this byte is read 
				bit by bit. This includes instructions such as "ringing a bell" (beep!), printing, and unlocking
				keyboard actions. For now, OldGarbo will ignore the WCC.
				
				The next byte comprises of Orders. Orders can be anywhere, not just as a third byte.
				They are one byte each.

				Orders can be any of the following:
				------------------------------------------------------------------------------------------------
				[NAME]							[ABBRV]	[HEX]	[DEC]	[DESC]
				Start Field						SF		0x1D	29		Indicates the start of a field. Next
																		byte is a field attribute.

				Start Field Extended			SFE		0x29	41		Indicates the start of a field. Followed 
																		by additional information:
																			Number of Attribute Value-Pairs
																			Attribute Type
																			Attribute Value
																		So by that logic:
																			SFE 2 3270 Value Color Red
																		Means default character set and red color
																		If number of value-pairs is 0, set to
																		defaults.

				Set Buffer Address				SBA		0x11	17		Will set where to write data, has two
																		leading bytes to tell location. Can be
																		placed behind any other order.

																		The leading bytes are read in binary.
																		If the first two bits of the first byte 
																		are 01 or 11:
																			Join the last 6 bits of both bytes 
																			to form a buffer position 
																			(ex: character 48 out of 1920)
																			Effectively making a 12-bit address.
																			So	01000011 + 
																				01000110 =
																				000011000110 (198)
																		If the first two bits of the first byte 
																		are 00:
																			Take the remaining bits of this byte
																			and add them to the following byte,
																			making a 14 bit address

				Set Attribute					SA		0x28	40		Specifies the next characters attributes
																		until:
																			A new SA changes the attributes.
																			Another write command is sent
																			CLEAR is pressed
																			You turn off your terminal
																		Can be used to specify charset, color,
																		highlight, blink status

				Modify Field					MF		0x2C	44		Starts modifying fields and their
																		attributed at the current buffer address
																		After update, buffer address is
																		incremented. Is followed by:
																			Number of Attribute Value-Pairs
																			Attribute Type
																			Attribute Value
																		Unspecified attributes are unchanged.

				Insert Cursor					IC		0x13	19		Changes cursor position
				Program Tab						PT		0x05	05		Advances buffer to next unprotected
																		field

				Repeat To Address				RA		0x3C	60		Repeats a character until specified
																		buffer address reached. Address is in
																		two bytes, then following byte is the
																		character to be repeated.

				Erase Unprotected To Address	EUA		0x12	18		Clears buffer until address reached.
																		Address is in two bytes.

				Graphic Escape					GE		0x08	08		Inserts a graphic character from an
																		alternate charset
				------------------------------------------------------------------------------------------------
				The following orders are stored in the character buffer and are as follows:
				[ORDER]		[HEX]	[DEC]	[DESC]
				NUL			0x00	00		Blank, suppressed on Read Modified
				SUB			0x3F	63		A solid circle
				DUP			0x1C	28		An overscore asterisk
				FM			0x1E	30		An overscore semicolon
				FF			0x0C	12		Blank
				CR			0x0D	13		Blank
				NL			0x15	21		Blank
				EM			0x19	25		Blank
				EO			0xFF	255		Blank


				Attributes:

					Character attributes are defined as a type-value pair
						[HEX]	[DEC]	[DESC]
						0x00	00		All attributes
						0xC0	192		3270 Field Attribute
						0xC1	193		Field Validation
											Values:
												[BIT]	[SETTING]	[PROPERTY]
												0-4		'0000'		Reserved, must be zero
												5		'1'			Mandatory fill
												6		'1'			Mandatory Entry
												7		'1'			Trigger

						0xC2	194		Field Outlining
						0x41	65		Extended Highlighting
											Values:
												[HEX]	[DEC]	[PROPERTY]
												0x00	00		Default
												0xF0	240		Normal
												0xF1	241		Blink
												0xF2	242		Reverse
												0xF4	244		Underscore
						0x42	66		Foreground Color
											Values:
												[HEX]	[DEC]	[PROPERTY]
												0x00	00		Default color
												0xF7	247		Neutral
						0x43	67		Character set
						0x45	69		Background Color
						0x46	70		Transparency
											Values:
												[HEX]	[DEC]	[PROPERTY]
												0x00	00		Default
												0xF0	240		Background is transparent (OR)
												0xF1	241		Background is transparent (XOR)
												0xFF	255		Background is opaque



					Field attributes are defined in a byte, with the following bits:
						[BIT]	[DESC]
						0&1		Is a graphic EBCDIC character
						2		Unprotected or protected
						3		Alphanumeric or Numeric-only
						4&5		00: Display/Not-Selector-Pen-Detectable
								01: Display/Selector-Pen-Detectable
								10: Intensified Display/Selector-Pen-Detectable
								11: Nondisplay/nondetectable
						6		Reserved, must always be 0
						7		Was modified

					Field attributes are present in the buffer, but displayed as space, and can't
					be modified.



			*/

			let firstByte = arrayFromBuffer[0];
			let currentCommand = 0;
			if(config.enhanced){
				let firstFiveBytes = uI
			}
			switch(firstByte){
				case 241:
					break;
				case 245:
					tnLib.display.clearBuffer();
					currentCommand = 245;
					break;
				case 126:
					break;
				case 242:
					break;
				case 246:
					break;
				case 110:
					break;
				case 111:
					break;
				case 243:
					break;
				default:
					// console.log("First character ["+firstByte+"] is not a valid command. Check if it's really a 3270 data stream.")
			}
			
			//Check if TELNET commands in stream. Binary stays in decimal, and commands get translated to their string counterparts
			for(let i = 2; i < arrayFromBuffer.length - 1; i++){
				// If the current value is 255
				if(arrayFromBuffer[i] == 255){
					// And that the following one is also 255
					if(arrayFromBuffer[i+1] == 255){
						// Then those two values together only mean a single 255 value, as per TELNET binary specs
						translatedArray.push(255);
						i = i + 2;
					}
					else{
						// If the following one is not 255, then it's an IAC telnet command
						translatedArray.push("IAC");
						// And we also fetch the following value as a TELNET command
						translatedArray.push(tnLib.fetchInLib(arrayFromBuffer[i+1]));
						
						// We skip a position
						i = i + 2;
					}
				}
				
				//Let's fill the buffer

				// 17 means going to a specific buffer index (SBA)
				if(arrayFromBuffer[i] == 17){
					//And it's only this Order if the next byte binary starts with '00','01' or '11'
					let nextPositionBin = arrayFromBuffer[i+1].toString(2);
					nextPositionBin = "00000000".substr(nextPositionBin.length) + nextPositionBin;
					if(nextPositionBin.substr(0,2) == "01" || nextPositionBin.substr(0,2) == "11"){
						let firstBin = arrayFromBuffer[i+1].toString(2);
						firstBin = "00000000".substr(firstBin.length) + firstBin;

						let secondBin = arrayFromBuffer[i+2].toString(2);
						secondBin = "00000000".substr(secondBin.length) + secondBin;

						let setIndexTo = firstBin.substr(2,7)+secondBin.substr(2,7);
						tnLib.display.setAddressFromIndex(parseInt(setIndexTo, 2));
						i = i + 4;
					}
				}
				
				// 29 is a field definition
				else if(arrayFromBuffer[i] == 29){
					let nextByte = arrayFromBuffer[i+1].toString(2);
					nextByte = "00000000".substr(nextByte.length) + nextByte;

					// if bit 6 is 0, then it surely must not be a character, YES?!
					if(nextByte[6] == 0){
						i = i + 2;
						// console.log("field definition");
						// console.log(nextByte);
					}
				}

				else{
					tnLib.display.writeChar(tnLib.ebcdic.decToAscii(arrayFromBuffer[i]));
				}
			}

			// console.log(arrayFromBuffer);
        }
	},
	ebcdic: {
		"table": [
			{
				"decimal":0,
				"asciiChar":"\0"
			},
			{
				"decimal":1,
				"asciiChar":"SOH"
			},
			{
				"decimal":2,
				"asciiChar":"STX"
			},
			{
				"decimal":3,
				"asciiChar":"ETX"
			},
			{
				"decimal":4,
				"asciiChar":"PF"
			},
			{
				"decimal":5,
				"asciiChar":"\t"
			},
			{
				"decimal":6,
				"asciiChar":"LC"
			},
			{
				"decimal":7,
				"asciiChar":"DEL"
			},
			{
				"decimal":8,
				"asciiChar":"GE"
			},
			{
				"decimal":9,
				"asciiChar":"RLF"
			},
			{
				"decimal":10,
				"asciiChar":"SMM"
			},
			{
				"decimal":11,
				"asciiChar":"\v"
			},
			{
				"decimal":12,
				"asciiChar":"\f"
			},
			{
				"decimal":13,
				"asciiChar":"\r"
			},
			{
				"decimal":14,
				"asciiChar":"SO"
			},
			{
				"decimal":15,
				"asciiChar":"SI"
			},
			{
				"decimal":16,
				"asciiChar":"DLE"
			},
			{
				"decimal":17,
				"asciiChar":"DC1"
				// "asciiChar":""
			},
			{
				"decimal":18,
				"asciiChar":"DC2"
			},
			{
				"decimal":19,
				"asciiChar":"TM"
			},
			{
				"decimal":20,
				"asciiChar":"RES"
			},
			{
				"decimal":21,
				"asciiChar":"NL"
			},
			{
				"decimal":22,
				"asciiChar":"\b"
			},
			{
				"decimal":23,
				"asciiChar":"IL"
			},
			{
				"decimal":24,
				"asciiChar":"CAN"
			},
			{
				"decimal":25,
				"asciiChar":"EM"
			},
			{
				"decimal":26,
				"asciiChar":"CC"
			},
			{
				"decimal":27,
				"asciiChar":"CU1"
			},
			{
				"decimal":28,
				"asciiChar":"IFS"
			},
			{
				"decimal":29,
				"asciiChar":"IGS"
			},
			{
				"decimal":30,
				"asciiChar":"IRS"
			},
			{
				"decimal":31,
				"asciiChar":"IUS"
			},
			{
				"decimal":32,
				"asciiChar":"DS"
				// "asciiChar":""
			},
			{
				"decimal":33,
				"asciiChar":"SOS"
			},
			{
				"decimal":34,
				"asciiChar":"FS"
			},
			{
				"decimal":35,
				"asciiChar":""
			},
			{
				"decimal":36,
				"asciiChar":"BYP"
			},
			{
				"decimal":37,
				"asciiChar":"\n"
			},
			{
				"decimal":38,
				"asciiChar":"ETB"
			},
			{
				"decimal":39,
				"asciiChar":"ESC"
			},
			{
				"decimal":40,
				"asciiChar":""
			},
			{
				"decimal":41,
				"asciiChar":""
			},
			{
				"decimal":42,
				"asciiChar":"SM"
			},
			{
				"decimal":43,
				"asciiChar":"CU2"
			},
			{
				"decimal":44,
				"asciiChar":""
			},
			{
				"decimal":45,
				"asciiChar":"ENQ"
			},
			{
				"decimal":46,
				"asciiChar":"ACK"
			},
			{
				"decimal":47,
				"asciiChar":"\a"
			},
			{
				"decimal":48,
				"asciiChar":""
			},
			{
				"decimal":49,
				"asciiChar":""
			},
			{
				"decimal":50,
				"asciiChar":"SYN"
			},
			{
				"decimal":51,
				"asciiChar":""
			},
			{
				"decimal":52,
				"asciiChar":"PN"
			},
			{
				"decimal":53,
				"asciiChar":"RS"
			},
			{
				"decimal":54,
				"asciiChar":"UC"
			},
			{
				"decimal":55,
				"asciiChar":"EOT"
			},
			{
				"decimal":56,
				"asciiChar":""
			},
			{
				"decimal":57,
				"asciiChar":""
			},
			{
				"decimal":58,
				"asciiChar":""
			},
			{
				"decimal":59,
				"asciiChar":"CUB"
			},
			{
				"decimal":60,
				"asciiChar":"DC4"
			},
			{
				"decimal":61,
				"asciiChar":"NAK"
			},
			{
				"decimal":62,
				"asciiChar":""
			},
			{
				"decimal":63,
				"asciiChar":"SUB"
			},
			{
				"decimal":64,
				// "asciiChar":"BLANK"
				"asciiChar":" "
			},
			{
				"decimal":65,
				"asciiChar":""
			},
			{
				"decimal":66,
				"asciiChar":""
			},
			{
				"decimal":67,
				"asciiChar":""
			},
			{
				"decimal":68,
				"asciiChar":""
			},
			{
				"decimal":69,
				"asciiChar":""
			},
			{
				"decimal":70,
				"asciiChar":""
			},
			{
				"decimal":71,
				"asciiChar":""
			},
			{
				"decimal":72,
				"asciiChar":""
			},
			{
				"decimal":73,
				"asciiChar":""
			},
			{
				"decimal":74,
				"asciiChar":"¢"
			},
			{
				"decimal":75,
				"asciiChar":"."
			},
			{
				"decimal":76,
				"asciiChar":"<"
			},
			{
				"decimal":77,
				"asciiChar":"("
			},
			{
				"decimal":78,
				"asciiChar":"+"
			},
			{
				"decimal":79,
				"asciiChar":"|"
			},
			{
				"decimal":80,
				"asciiChar":""
			},
			{
				"decimal":81,
				"asciiChar":""
			},
			{
				"decimal":82,
				"asciiChar":""
			},
			{
				"decimal":83,
				"asciiChar":""
			},
			{
				"decimal":84,
				"asciiChar":""
			},
			{
				"decimal":85,
				"asciiChar":""
			},
			{
				"decimal":86,
				"asciiChar":""
			},
			{
				"decimal":87,
				"asciiChar":""
			},
			{
				"decimal":88,
				"asciiChar":""
			},
			{
				"decimal":89,
				"asciiChar":""
			},
			{
				"decimal":90,
				"asciiChar":"!"
			},
			{
				"decimal":91,
				"asciiChar":"$"
			},
			{
				"decimal":92,
				"asciiChar":"*"
			},
			{
				"decimal":93,
				"asciiChar":")"
			},
			{
				"decimal":94,
				"asciiChar":";"
			},
			{
				"decimal":95,
				"asciiChar":"¬"
			},
			{
				"decimal":96,
				"asciiChar":"-"
			},
			{
				"decimal":97,
				"asciiChar":"/"
			},
			{
				"decimal":98,
				"asciiChar":""
			},
			{
				"decimal":99,
				"asciiChar":""
			},
			{
				"decimal":100,
				"asciiChar":""
			},
			{
				"decimal":101,
				"asciiChar":""
			},
			{
				"decimal":102,
				"asciiChar":""
			},
			{
				"decimal":103,
				"asciiChar":""
			},
			{
				"decimal":104,
				"asciiChar":""
			},
			{
				"decimal":105,
				"asciiChar":""
			},
			{
				"decimal":106,
				"asciiChar":"¦"
			},
			{
				"decimal":107,
				"asciiChar":","
			},
			{
				"decimal":108,
				"asciiChar":"%"
			},
			{
				"decimal":109,
				"asciiChar":"_"
			},
			{
				"decimal":110,
				"asciiChar":">"
			},
			{
				"decimal":111,
				"asciiChar":"?"
			},
			{
				"decimal":112,
				"asciiChar":""
			},
			{
				"decimal":113,
				"asciiChar":""
			},
			{
				"decimal":114,
				"asciiChar":""
			},
			{
				"decimal":115,
				"asciiChar":""
			},
			{
				"decimal":116,
				"asciiChar":""
			},
			{
				"decimal":117,
				"asciiChar":""
			},
			{
				"decimal":118,
				"asciiChar":""
			},
			{
				"decimal":119,
				"asciiChar":""
			},
			{
				"decimal":120,
				"asciiChar":""
			},
			{
				"decimal":121,
				"asciiChar":"`"
			},
			{
				"decimal":122,
				"asciiChar":":"
			},
			{
				"decimal":123,
				"asciiChar":"#"
			},
			{
				"decimal":124,
				"asciiChar":"@"
			},
			{
				"decimal":125,
				"asciiChar":"'"
			},
			{
				"decimal":126,
				"asciiChar":"="
			},
			{
				"decimal":127,
				"asciiChar":"\\"
			},
			{
				"decimal":128,
				"asciiChar":""
			},
			{
				"decimal":129,
				"asciiChar":"a"
			},
			{
				"decimal":130,
				"asciiChar":"b"
			},
			{
				"decimal":131,
				"asciiChar":"c"
			},
			{
				"decimal":132,
				"asciiChar":"d"
			},
			{
				"decimal":133,
				"asciiChar":"e"
			},
			{
				"decimal":134,
				"asciiChar":"f"
			},
			{
				"decimal":135,
				"asciiChar":"g"
			},
			{
				"decimal":136,
				"asciiChar":"h"
			},
			{
				"decimal":137,
				"asciiChar":"i"
			},
			{
				"decimal":138,
				"asciiChar":""
			},
			{
				"decimal":139,
				"asciiChar":""
			},
			{
				"decimal":140,
				"asciiChar":""
			},
			{
				"decimal":141,
				"asciiChar":""
			},
			{
				"decimal":142,
				"asciiChar":""
			},
			{
				"decimal":143,
				"asciiChar":""
			},
			{
				"decimal":144,
				"asciiChar":""
			},
			{
				"decimal":145,
				"asciiChar":"j"
			},
			{
				"decimal":146,
				"asciiChar":"k"
			},
			{
				"decimal":147,
				"asciiChar":"l"
			},
			{
				"decimal":148,
				"asciiChar":"m"
			},
			{
				"decimal":149,
				"asciiChar":"n"
			},
			{
				"decimal":150,
				"asciiChar":"o"
			},
			{
				"decimal":151,
				"asciiChar":"p"
			},
			{
				"decimal":152,
				"asciiChar":"q"
			},
			{
				"decimal":153,
				"asciiChar":"r"
			},
			{
				"decimal":154,
				"asciiChar":""
			},
			{
				"decimal":155,
				"asciiChar":""
			},
			{
				"decimal":156,
				"asciiChar":""
			},
			{
				"decimal":157,
				"asciiChar":""
			},
			{
				"decimal":158,
				"asciiChar":""
			},
			{
				"decimal":159,
				"asciiChar":""
			},
			{
				"decimal":160,
				"asciiChar":""
			},
			{
				"decimal":161,
				"asciiChar":"~"
			},
			{
				"decimal":162,
				"asciiChar":"s"
			},
			{
				"decimal":163,
				"asciiChar":"t"
			},
			{
				"decimal":164,
				"asciiChar":"u"
			},
			{
				"decimal":165,
				"asciiChar":"v"
			},
			{
				"decimal":166,
				"asciiChar":"w"
			},
			{
				"decimal":167,
				"asciiChar":"x"
			},
			{
				"decimal":168,
				"asciiChar":"y"
			},
			{
				"decimal":169,
				"asciiChar":"z"
			},
			{
				"decimal":170,
				"asciiChar":""
			},
			{
				"decimal":171,
				"asciiChar":""
			},
			{
				"decimal":172,
				"asciiChar":""
			},
			{
				"decimal":173,
				"asciiChar":""
			},
			{
				"decimal":174,
				"asciiChar":""
			},
			{
				"decimal":175,
				"asciiChar":""
			},
			{
				"decimal":176,
				"asciiChar":""
			},
			{
				"decimal":177,
				"asciiChar":""
			},
			{
				"decimal":178,
				"asciiChar":""
			},
			{
				"decimal":179,
				"asciiChar":""
			},
			{
				"decimal":180,
				"asciiChar":""
			},
			{
				"decimal":181,
				"asciiChar":""
			},
			{
				"decimal":182,
				"asciiChar":""
			},
			{
				"decimal":183,
				"asciiChar":""
			},
			{
				"decimal":184,
				"asciiChar":""
			},
			{
				"decimal":185,
				"asciiChar":""
			},
			{
				"decimal":186,
				"asciiChar":""
			},
			{
				"decimal":187,
				"asciiChar":""
			},
			{
				"decimal":188,
				"asciiChar":""
			},
			{
				"decimal":189,
				"asciiChar":""
			},
			{
				"decimal":190,
				"asciiChar":""
			},
			{
				"decimal":191,
				"asciiChar":""
			},
			{
				"decimal":192,
				"asciiChar":"{"
			},
			{
				"decimal":193,
				"asciiChar":"A"
			},
			{
				"decimal":194,
				"asciiChar":"B"
			},
			{
				"decimal":195,
				"asciiChar":"C"
			},
			{
				"decimal":196,
				"asciiChar":"D"
			},
			{
				"decimal":197,
				"asciiChar":"E"
			},
			{
				"decimal":198,
				"asciiChar":"F"
			},
			{
				"decimal":199,
				"asciiChar":"G"
			},
			{
				"decimal":200,
				"asciiChar":"H"
			},
			{
				"decimal":201,
				"asciiChar":"I"
			},
			{
				"decimal":202,
				"asciiChar":""
			},
			{
				"decimal":203,
				"asciiChar":""
			},
			{
				"decimal":204,
				"asciiChar":"non-displayable"
			},
			{
				"decimal":205,
				"asciiChar":""
			},
			{
				"decimal":206,
				"asciiChar":"non-displayable"
			},
			{
				"decimal":207,
				"asciiChar":""
			},
			{
				"decimal":208,
				"asciiChar":"}"
			},
			{
				"decimal":209,
				"asciiChar":"J"
			},
			{
				"decimal":210,
				"asciiChar":"K"
			},
			{
				"decimal":211,
				"asciiChar":"L"
			},
			{
				"decimal":212,
				"asciiChar":"M"
			},
			{
				"decimal":213,
				"asciiChar":"N"
			},
			{
				"decimal":214,
				"asciiChar":"O"
			},
			{
				"decimal":215,
				"asciiChar":"P"
			},
			{
				"decimal":216,
				"asciiChar":"Q"
			},
			{
				"decimal":217,
				"asciiChar":"R"
			},
			{
				"decimal":218,
				"asciiChar":""
			},
			{
				"decimal":219,
				"asciiChar":""
			},
			{
				"decimal":220,
				"asciiChar":""
			},
			{
				"decimal":221,
				"asciiChar":""
			},
			{
				"decimal":222,
				"asciiChar":""
			},
			{
				"decimal":223,
				"asciiChar":""
			},
			{
				"decimal":224,
				"asciiChar":"\\"
			},
			{
				"decimal":225,
				"asciiChar":""
			},
			{
				"decimal":226,
				"asciiChar":"S"
			},
			{
				"decimal":227,
				"asciiChar":"T"
			},
			{
				"decimal":228,
				"asciiChar":"U"
			},
			{
				"decimal":229,
				"asciiChar":"V"
			},
			{
				"decimal":230,
				"asciiChar":"W"
			},
			{
				"decimal":231,
				"asciiChar":"X"
			},
			{
				"decimal":232,
				"asciiChar":"Y"
			},
			{
				"decimal":233,
				"asciiChar":"Z"
			},
			{
				"decimal":234,
				"asciiChar":""
			},
			{
				"decimal":235,
				"asciiChar":""
			},
			{
				"decimal":236,
				"asciiChar":"non-displayable"
			},
			{
				"decimal":237,
				"asciiChar":""
			},
			{
				"decimal":238,
				"asciiChar":""
			},
			{
				"decimal":239,
				"asciiChar":""
			},
			{
				"decimal":240,
				"asciiChar":"0"
			},
			{
				"decimal":241,
				"asciiChar":"1"
			},
			{
				"decimal":242,
				"asciiChar":"2"
			},
			{
				"decimal":243,
				"asciiChar":"3"
			},
			{
				"decimal":244,
				"asciiChar":"4"
			},
			{
				"decimal":245,
				"asciiChar":"5"
			},
			{
				"decimal":246,
				"asciiChar":"6"
			},
			{
				"decimal":247,
				"asciiChar":"7"
			},
			{
				"decimal":248,
				"asciiChar":"8"
			},
			{
				"decimal":249,
				"asciiChar":"9"
			},
			{
				"decimal":250,
				"asciiChar":"non-displayable"
			},
			{
				"decimal":251,
				"asciiChar":""
			},
			{
				"decimal":252,
				"asciiChar":""
			},
			{
				"decimal":253,
				"asciiChar":""
			},
			{
				"decimal":254,
				"asciiChar":""
			},
			{
				"decimal":255,
				"asciiChar":"EO"
			}
		],
		"decToAscii": function(dec){
			const foundAscii = this.table.find(element => element.decimal === dec);
			// console.log(foundAscii.asciiChar);
			return foundAscii.asciiChar;
		},
		"asciiToDec": function(ascii){
			const foundDec = this.table.find(element => element.asciiChar === ascii);
			return foundDec;
		}
	}
};

module.exports = tnLib;
