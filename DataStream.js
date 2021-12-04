//DataStream.js
const telnetLib = require("./telnetLib");

const asciiMethods = require("./asciiMethods");

const iMsg = require('./inMsg');
let inMsg = new iMsg();

const oMsg = require('./outMsg');
let outMsg = new oMsg();

let config = require("../config");

const keyMap = require("./keyMap");

const TermScripts = require('./TermScripts');
const tScripts = new TermScripts();

const EBCDIC = require('./EBCDIC');
const ebc = new EBCDIC();

const OGscript = require('./OGscript');
const ogs = new OGscript();


const Sbuffer = require("./screenBuffer");
let screenBuffer = new Sbuffer();

class DataStream{
    constructor(){
        this.currentConfig = {
            tn3270e: false,
            options: {
                request: false,
                bindImage: false,
                responses: false
            }
        };
    }

    setConfig(parameters){
        if(typeof parameters == "object"){
            if(parameters.hasOwnProperty("tn3270e")){
                this.currentConfig.tn3270e = parameters.tn3270e;
            }

            if(parameters.hasOwnProperty("options")){
                if(parameters.options.hasOwnProperty("request")){
                    this.currentConfig.options.request = parameters.options.request;
                }

                if(parameters.options.hasOwnProperty("bindImage")){
                    this.currentConfig.options.bindImage = parameters.options.bindImage;
                }

                if(parameters.options.hasOwnProperty("responses")){
                    this.currentConfig.options.responses = parameters.options.responses;
                }
            }
        }
        /* else{
            return false;
        } */
    }

    fromHost(data){
        let header;
        let footer;

        // Unwrapped header and footer if TN3270e
        if(this.currentConfig.tn3270e){
            let unwrapped = inMsg.unwrap(data);
            header = unwrapped.header;
            data = unwrapped.data;
            footer = unwrapped.footer;
            if(unwrapped.header.dataType == 3){
                // future bind-image stuff
                return false;
            }
        }

        let arrayFromBuffer = Uint8Array.from(data);
        let translatedArray = [];
        
        // The Data Stream may end with IAC EOR, to delimit the end of the stream. So we'll remove that for now, and place it back in after processing.
        let endOfRecords = [];
        if(arrayFromBuffer[arrayFromBuffer.length-2] == 255 && arrayFromBuffer[arrayFromBuffer.length-1] == 239){
            endOfRecords = ["IAC","EOR"];
            arrayFromBuffer = arrayFromBuffer.slice(0, arrayFromBuffer.length-2);
        }

        let firstByte = arrayFromBuffer[0];
        let secondByte = arrayFromBuffer[1].toString(2);
        secondByte = "00000000".substr(secondByte.length) + secondByte;
        // console.log(firstByte);
        // console.log(secondByte);
        let currentCommand = 0;
        switch(firstByte){
            case 241:
                break;
            case 245:
                screenBuffer.clearBuffer();
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
        // let tempString = "";

        // To keep track of the current Field Definition
        let currFieldDefinition = {
            protected: false,
            alphaNum: false,
            typeDisplay: 0,
            modified: false
        };

        //Check if TELNET commands in stream. Binary stays in decimal, and commands get translated to their string counterparts
        for(let i = 2; i < arrayFromBuffer.length - 1; i++){
            /* // If the current value is 255
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
                    translatedArray.push(asciiMethods.getKeyByValue(telnetLib.commands, arrayFromBuffer[i+1]));
                    
                    // We skip a position
                    i = i + 2;
                }
            } */
            
            // Let's fill the buffer

            // Always keeping an eye for the next byte
            let nextByte = arrayFromBuffer[i+1];
            let nextByteBin = nextByte.toString(2);
            nextByteBin = "00000000".substr(nextByteBin.length) + nextByteBin;

            switch(arrayFromBuffer[i]){
                // PT: Program Tab
                case 5:
                    console.log("PT");
                    break;
                
                // GE: Graphic Escape
                case 8:
                    console.log("GE");
                    break;
                
                // SBA, changes buffer address
                case 17:
                    console.log("SBA");
                    let typeOfAddress = nextByteBin.slice(0,2);
                    // If the next byte starts with either 01 or 11, it's a 12-bit coded address
                    if(typeOfAddress == "01" || typeOfAddress == "11"){
                        let thirdByteBin = arrayFromBuffer[i+2].toString(2);
                        thirdByteBin = "00000000".substr(thirdByteBin.length) + thirdByteBin;
                        // console.log(nextByteBin, nextByteBin.substr(2, 7));
                        let indexNumber = nextByteBin.substr(2, 7) + thirdByteBin.substr(2, 7);
                        screenBuffer.setAddressFromIndex(parseInt(indexNumber, 2));
                    }
                    // If it starts with 00, it's a 14-bit address
                    else if(typeOfAddress == "00"){
                        console.log("14 bit");

                    }
                    // let addressDec = this.extractAddress(nextByte, arrayFromBuffer[i+2]);

                    /* if(addressDec.isAddress){
                        screenBuffer.setAddressFromIndex(addressDec.addressDec);
                        i = i + 2;
                    } */
                    // Jumping 2 bytes forwards, will get incremented +1 at next loop;
                    i = i + 2;
                    break;

                // EUA: Erase Unprotected To Address
                case 18:
                    console.log("EUA");
                    break;
                
                // IC: Insert Cursor at last bufferAddress
                case 19:
                    // console.log("IC");
                    // let buffAddress = screenBuffer.bufferAddress[0] * screenBuffer.bufferAddress[1]
                    screenBuffer.cursorAddress[0] = screenBuffer.bufferAddress[0];
                    screenBuffer.cursorAddress[1] = screenBuffer.bufferAddress[1];
                    break;
                
                // SF: changes field definition
                case 29:
                    // console.log("SF");
                    // If the field is now protected or not
                    if(nextByteBin[2] == 1){
                        currFieldDefinition.protected = true;
                    }
                    else{
                        currFieldDefinition.protected = false;
                    }
                    
                    // Alpha Numeric or Numeric-only, false is alpha and true is numeric
                    if(nextByteBin[3] == 1){
                        currFieldDefinition.alphaNum = true;
                    }
                    else{
                        currFieldDefinition.alphaNum = false;
                    }

                    // If the field was modified
                    if(nextByteBin[7] == 1){
                        currFieldDefinition.modified = true;
                    }
                    else{
                        currFieldDefinition.modified = false;
                    }

                    // Bits 4 and 5 are for type of display. So we add them together and calculate the value.
                    let displayTypeValue = nextByteBin[4]+nextByteBin[5];
                    displayTypeValue = parseInt(displayTypeValue, 2);
                    currFieldDefinition.typeDisplay = displayTypeValue;
                    
                    // The SF field attributes is a blank character, present in the buffer. 
                    //                     Character  Current Field Def    If is an SF
                    screenBuffer.writeChar(undefined, currFieldDefinition, true);

                    // Since this is a 2 byte section, we skip one position, which gets incremented once more next loop
                    i = i + 1;
                    break;
                
                // SA: Set Attribute
                case 40:
                    console.log("SA");
                    break;
                
                // SFE: Start Field Extended
                case 41:
                    console.log("SFE");
                    break;
                
                // MF: Modify Field
                case 44:
                    console.log("MF")
                    break;

                // RA: Repeat To Address
                case 60:
                    // console.log("RA");
                    /* let typeOfAddress = nextByteBin.slice(0,2);
                    if(typeOfAddress == "01" || typeOfAddress == "11"){
                        let thirdByteBin = arrayFromBuffer[i+2].toString(2);
                        thirdByteBin = "00000000".substr(thirdByteBin.length) + thirdByteBin;

                        let repeatToIndexNumber = parseInt(nextByteBin.substr(2, 7) + thirdByteBin.substr(2, 7), 2);
                        let currAddress = screenBuffer.bufferAddress[0] * screenBuffer.bufferAddress[1];
                        let nbOfRepeats = repeatToIndexNumber - currAddress;
                        for(let i = 0; i < nbOfRepeats.length; i++){
                            screenBuffer.writeChar(arrayFromBuffer[i+4], currFieldDefinition);
                        }
                    } */

                    let extractedAddress = this.extractAddress(nextByte, arrayFromBuffer[i+2]);

                    if(extractedAddress.isAddress){
                        let currAddress = screenBuffer.bufferAddress[0] * screenBuffer.bufferAddress[1];
                        let nbOfRepeats = extractedAddress.addressDec - currAddress;
                        for(let i = 0; i < nbOfRepeats.length; i++){
                            screenBuffer.writeChar(arrayFromBuffer[i+4], currFieldDefinition);
                        }
                        // screenBuffer.setAddressFromIndex(addressDec.addressDec);
                        i = i + 4;
                    }
                    // Jumping 4 bytes forwards, will get incremented +1 at next loop;
                    // i = i + 4;
                    break;
                
                default:
                    screenBuffer.writeChar(arrayFromBuffer[i], currFieldDefinition);
            }
        }
        screenBuffer.printBuffer();
    }

    /**
     * What to write, and where.
     * @returns a buffer of data to send to the host - empty if no key pressed
     */
    toHost(keyPressed){
        let returnedObjectBuffer = {
            buff: Buffer.from("")
		};
		
        if(keyPressed){
            // const loginScript = tScripts.fetchInst("login");
            tScripts.fetchInst("login");

            // console.log(tScripts.currentInstructions.instructions[0]);
			//let nextCommand = tScripts.nextPos();
			returnedObjectBuffer.buff = ogs.sentenceToBuffer(tScripts.currentInstructions.instructions[0]);
        }

        return returnedObjectBuffer;
    }
	
	
}

module.exports = DataStream;