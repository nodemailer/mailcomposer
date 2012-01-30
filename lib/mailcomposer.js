var Stream = require("stream").Stream,
    utillib = require("util"),
    mimelib = require("mimelib-noiconv"),
    toPunycode = require("./punycode");

module.exports.MailComposer = MailComposer;

/**
 * <p>Costructs a MailComposer object. This is a Stream instance so you could
 * pipe the output to a file or send it to network.</p>
 * 
 * <p>Possible options properties are:</p>
 * 
 * <ul>
 *     <li><b>escapeSMTP</b> - convert dots in the beginning of line to double dots</li>
 *     <li><b>encoding</b> - forced transport encoding (quoted-printable, base64, 7bit or 8bit)</li>
 * </ul>
 * 
 * <p><b>Events</b></p>
 * 
 * <ul>
 *     <li><b>'envelope'</b> - emits an envelope object with <code>from</code> and <code>to</code> (array) addresses.</li>
 *     <li><b>'data'</b> - emits a chunk of data</li>
 *     <li><b>'end'</b> - composing the message has ended</li>
 * </ul>
 * 
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailComposer(options){
    Stream.call(this);
    
    this.options = options || {};
    
    this.init();
}
utillib.inherits(MailComposer, Stream);

/**
 * <p>Resets and initializes MailComposer</p>
 */
MailComposer.prototype.init = function(){
    /**
     * <p>Contains all header values</p>
     * @private
     */
    this._headers = {};
    
    /**
     * <p>Contains message related values</p>
     * @private
     */
    this._message = {};
    
    /**
     * <p>Contains a list of attachments</p>
     * @private
     */
    this._attachments = [];
    
    /**
     * <p>Contains e-mail addresses for the SMTP</p>
     * @private
     */
    this._envelope = {};
    
    /**
     * <p>Counter for generating unique mime boundaries etc.</p>
     * @private
     */
    this._gencounter = 0;
    
    this.addHeader("MIME-Version", "1.0");
};


/**
 * <p>Resets and initializes MailComposer</p>
 * 
 * <p>Setting an option overwrites an earlier setup for the same keys</p>
 * 
 * <p>Possible options:</p>
 * 
 * <ul>
 *     <li><b>from</b> - The e-mail address of the sender. All e-mail addresses can be plain <code>sender@server.com<code> or formatted <code>Sender Name &lt;sender@server.com&gt;</code></li>
 *     <li><b>to</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>To:</code> field</li>
 *     <li><b>cc</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>Cc:</code> field</li>
 *     <li><b>bcc</b> - Comma separated list of recipients e-mail addresses that will appear on the <code>Bcc:</code> field</li>
 *     <li><b>replyTo</b> - An e-mail address that will appear on the <code>Reply-To:</code> field</li>
 *     <li><b>subject</b> - The subject of the e-mail</li>
 *     <li><b>body</b> - The plaintext version of the message</li>
 *     <li><b>html</b> - The HTML version of the message</li>
 * </ul>
 * 
 * @param {Object} options Message related options
 */
MailComposer.prototype.setMessageOption = function(options){
    var fields = ["from", "to", "cc", "bcc", "replyTo", "subject", "body", "html"],
        rewrite = {"sender":"from", "reply_to":"replyTo"};
    
    options = options || {};
    
    var keys = Object.keys(options), key, value;
    for(var i=0, len=keys.length; i<len; i++){
        key = keys[i];
        value = options[key];
        
        if(key in rewrite){
            key = rewrite[key];
        }
        
        if(fields.indexOf(key) >= 0){
            this._message[key] = this.handleValue(key, value);
        }
    }
};

/**
 * <p>Handles a message object value, converts addresses etc.</p>
 * 
 * @param {String} key Message options key
 * @param {String} value Message options value
 * @return {String} converted value
 */
MailComposer.prototype.handleValue = function(key, value){
    key = (key || "").toString();
    
    var addresses;
    
    switch(key){
        case "from":
        case "to":
        case "cc":
        case "bcc":
        case "replyTo":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            addresses = mimelib.parseAddresses(value);
            this._envelope[key] = addresses.map((function(address){
                if(this.hasUTFChars(address.address)){
                    return toPunycode(address.address);
                }else{
                    return address.address;
                }
            }).bind(this));
            return this.convertAddresses(addresses);
        case "subject":
            value = (value || "").toString().replace(/\r?\n|\r/g, " ");
            return this.encodeMimeWord(value, "Q", 78);
    }
    
    return value;
};

/**
 * <p>Handles a list of parsed e-mail addresses, checks encoding etc.</p>
 * 
 * @param {Array} value A list or single e-mail address <code>{address:'...', name:'...'}</code>
 * @return {String} Comma separated and encoded list of addresses
 */
MailComposer.prototype.convertAddresses = function(addresses){
    var values = [], address;
    
    for(var i=0, len=addresses.length; i<len; i++){
        address = addresses[i];
        
        if(address.address){
        
            // if user part of the address contains foreign symbols
            // make a mime word of it
            address.address = address.address.replace(/^.*?(?=\@)/, (function(user){
                if(this.hasUTFChars(user)){
                    return mimelib.encodeMimeWord(user, "Q");
                }else{
                    return user;
                }
            }).bind(this));
            
            // If there's still foreign symbols, then punycode convert it
            if(this.hasUTFChars(address.address)){
                address.address = toPunycode(address.address);
            }
        
            if(!address.name){
                values.push(address.address);
            }else if(address.name){
                if(this.hasUTFChars(address.name)){
                    address.name = this.encodeMimeWord(address.name, "Q", 78);
                }else{
                    address.name = address.name;
                }
                values.push('"' + address.name+'" <'+address.address+'>');
            }
        }
    }
    return values.join(", ");
};

/**
 * <p>Adds a header field to the headers object</p>
 * 
 * @param {String} key Key name
 * @param {String} value Header value
 */
MailComposer.prototype.addHeader = function(key, value){
    key = this.normalizeKey(key);
    value = (value || "").toString().trim();
    if(!key || !value){
        return;
    }
    
    if(!(key in this._headers)){
        this._headers[key] = value;
    }else{
        if(!Array.isArray(this._headers[key])){
            this._headers[key] = [this._headers[key], value];
        }else{
            this._headers[key].push(value);
        }
    }
};

/**
 * <p>Gets a header field</p>
 * 
 * @param {String} key Key name
 * @return {String|Array} Header field - if several values, then it's an array
 */
MailComposer.prototype.getHeader = function(key){
    var value;
    
    key = this.normalizeKey(key);
    value = this._headers[key] || "";
    
    return value;
};

/**
 * <p>Adds an attachment to the list</p>
 * 
 * <p>Following options are allowed:</p>
 * 
 * <ul>
 *     <li><b>fileName</b> - filename for the attachment</li>
 *     <li><b>contentType</b> - content type for the attachmetn (default will be derived from the filename)</li>
 *     <li><b>cid</b> - Content ID value for inline images</li>
 *     <li><b>contents</b> - String or Buffer attachment contents</li>
 *     <li><b>filePath</b> - Path to a file for streaming</li>
 * </ul>
 * 
 * <p>One of <code>contents</code> or <code>filePath</code> must be specified, otherwise
 * the attachment is not included</p>
 * 
 * @param {Object} attachment Attachment info
 */
MailComposer.prototype.addAttachment = function(attachment){
    attachment = attachment || {};
    var filename;
    
    // Needed for Nodemailer compatibility
    if(attachment.filename){
        attachment.fileName = attachment.filename;
        delete attachment.filename;
    }
    
    if(!attachment.contentType){
        filename = attachment.fileName || attachment.filePath;
        if(filename){
            attachment.contentType = this.getMimeType(filename);
        }else{
            attachment.contentType = "application/octet-stream";
        }
    }
    
    if(attachment.filePath || attachment.contents){
        this._attachments.push(attachment);
    }
};

/**
 * <p>Generate an e-mail from the described info</p>
 */
MailComposer.prototype.composeMessage = function(){
    
    //Emit addresses for the SMTP client
    this.composeEnvelope();
    
    // Generate headers for the message
    this.composeHeader();
    
    // Compose message body
    this.composeBody();
    
};

/**
 * <p>Composes and emits an envelope from the <code>this._envelope</code> 
 * object. Needed for the SMTP client</p>
 * 
 * <p>Emitted envelope is int hte following structure:</p>
 * 
 * <pre>
 * {
 *     to: "address",
 *     from: ["list", "of", "addresses"]
 * }
 * </pre>
 * 
 * <p>Both properties (<code>from</code> and <code>to</code>) are optional
 * and may not exist</p>
 */
MailComposer.prototype.composeEnvelope = function(){
    var envelope = {},
        toKeys = ["to", "cc", "bcc"],
        key;
    
    // If multiple addresses, only use the first one
    if(this._envelope.from && this._envelope.from.length){
        envelope.from = [].concat(this._envelope.from).shift();
    }
    
    for(var i=0, len=toKeys.length; i<len; i++){
        key = toKeys[i];
        if(this._envelope[key] && this._envelope[key].length){
            if(!envelope.to){
                envelope.to = [];
            }
            envelope.to = envelope.to.concat(this._envelope[key]);
        }
    }
    
    this.emit("envelope", envelope);
};

/**
 * <p>Composes a header for the message and emits it with a <code>'data'</code>
 * event</p>
 * 
 * <p>Also checks and build a structure for the message (is it a multipart message
 * and does it need a boundary etc.)</p>
 * 
 * <p>By default the message is not a multipart. If the message containes both
 * plaintext and html contents, an alternative block is used. it it containes
 * attachments, a mixed block is used. If both alternative and mixed exist, then
 * alternative resides inside mixed.</p>
 */
MailComposer.prototype.composeHeader = function(){
    var keys, key, headers = [];
    
    if(this._message.body && this._message.html){
        this._message.useAlternative = true;
        this._message.alternativeBoundary = this.generateBoundary();
    }else{
        this._message.useAlternative = false;
    }
    
    if(this._attachments.length){
        this._message.useMixed = true;
        this._message.mixedBoundary = this.generateBoundary();
    }else{
        this._message.useMixed = false;
    }
    
    if(this._message.useMixed){
        this._messageType = "multipart/mixed";
        this._messageBoundary = this._message.mixedBoundary;
    }else if(this._message.useAlternative){
        this._messageType = "multipart/alternative";
        this._messageBoundary = this._message.alternativeBoundary;
    }else if(this._message.html){
        this._messageType = "text/html; charset=utf-8";
        this._message.encoding = this.options.encoding || "quoted-printable";
    }else{
        this._messageType = "text/plain; charset=utf-8";
        this._message.encoding = this.options.encoding || "quoted-printable";
    }
    
    this.buildMessageHeaders();
    
    // Compile header lines
    keys = Object.keys(this._headers);
    for(var i=0, len = keys.length; i<len; i++){
        key = this.normalizeKey(keys[i]);
        
        headers = headers.concat([].concat(this._headers[key]).map(function(value){
            return mimelib.foldLine(key+": "+value);
        }));
    }
    
    this.emit("data", new Buffer(headers.join("\r\n")+"\r\n\r\n", "utf-8"));
};

/**
 * <p>Uses data from the <code>this._message</code> object to build headers</p>
 */
MailComposer.prototype.buildMessageHeaders = function(){
    var contentType;
    
    if(this._messageBoundary){
        contentType = this._messageType+"; boundary=\""+this._messageBoundary+"\"";
    }else{
        contentType = this._messageType;
    }
    
    this.addHeader("Content-Type", this._messageType);
    this.addHeader("Content-Transfer-Encoding", this._message.encoding);
    
    // FROM
    if(this._message.from && this._message.from.length){
        [].concat(this._message.from).forEach((function(from){
            this.addHeader("From", from);
        }).bind(this));
    }
    
    // TO
    if(this._message.to && this._message.to.length){
        [].concat(this._message.to).forEach((function(to){
            this.addHeader("To", to);
        }).bind(this));
    }
    
    // CC
    if(this._message.cc && this._message.cc.length){
        [].concat(this._message.cc).forEach((function(cc){
            this.addHeader("Cc", cc);
        }).bind(this));
    }
    
    // REPLY-TO
    if(this._message.replyTo && this._message.replyTo.length){
        [].concat(this._message.replyTo).forEach((function(replyTo){
            this.addHeader("Reply-To", replyTo);
        }).bind(this));
    }
    
    // SUBJECT
    if(this._message.subject){
        this.addHeader("Subject", this._message.subject);
    }
}

/**
 * <p>Composes the e-mail body</p>
 */
MailComposer.prototype.composeBody = function(){
    this.generateBodyStructure();
    
    console.log("lol");
}

/**
 * <p>Generates the structure (mime tree) of the body</p>
 */
MailComposer.prototype.generateBodyStructure = function(){
    var tree = {childNodes:[]}, currentNode = tree;
    
    if(this._message.useMixed){

    }
}

/*
 * <p>Normalizes a key nam by cpitalizing first chars of words</p>
 * 
 * <p><code>x-mailer</code> will become <code>X-Mailer</code></p>
 * 
 * <p>Needed to avoid duplicate header keys</p>
 * 
 * @param {String} key Key name
 * @return {String} First chars uppercased
 */
MailComposer.prototype.normalizeKey = function(key){
    return (key || "").toString().trim().
        toLowerCase().
        replace(/^\S|[\-\s]\S/g, function(c){
            return c.toUpperCase();
        }).replace(/^MIME\-/i, "MIME-");
};

/**
 * <p>Tests if a string has high bit (UTF-8) symbols</p>
 * 
 * @param {String} str String to be tested for high bit symbols
 * @return {Boolean} true if high bit symbols were found
 */
MailComposer.prototype.hasUTFChars = function(str){
    var rforeign = /[^\u0000-\u007f]/;
    return !!rforeign.test(str);
};

/**
 * <p>Generates a boundary for multipart bodies</p>
 * 
 * @return {String} Boundary String
 */
MailComposer.prototype.generateBoundary = function(){
    // "_" is not allowed in quoted-printable and "?" not in base64
    return "----mailcomposer-?=_"+(++this._gencounter)+"-"+Date.now();
};

/**
 * <p>Converts a string to mime word format. If the length is longer than
 * <code>maxlen</code>, split it</p>
 * 
 * <p>If the string doesn't have any unicode characters return the original 
 * string instead</p>
 * 
 * @param {String} str String to be encoded
 * @param {String} encoding Either Q for Quoted-Printable or B for Base64
 * @param {Number} [maxlen] Optional length of the resulting string, whitespace will be inserted if needed
 * 
 * @return {String} Mime-word encoded string (if needed)
 */
MailComposer.prototype.encodeMimeWord = function(str, encoding, maxlen){
    encoding = (encoding || "Q").toUpperCase(); 
    if(this.hasUTFChars(str)){
        str = mimelib.encodeMimeWord(str, encoding);
        if(maxlen && str.length>maxlen){
            return str.replace(new RegExp(".{"+maxlen+"}","g"),"$&?= =?UTF-8?"+encoding+"?");
        }else{
            return str;
        }
    }else{
        return str;
    }
};

/**
 * <p>Resolves a mime type for a filename</p>
 * 
 * @param {String} filename Filename to check
 * @return {String} Corresponding mime type
 */
MailComposer.prototype.getMimeType = function(filename){
    var defaultMime = "application/octet-stream",
        extension = filename && filename.substr(filename.lastIndexOf(".")+1).trim().toLowerCase();
    return extension && mimelib.contentTypes[extension] || defaultMime;
};