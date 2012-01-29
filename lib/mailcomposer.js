var Stream = require("stream").Stream,
    utillib = require("util"),
    mimelib = require("mimelib-noiconv");

module.exports.MailComposer = MailComposer;

/**
 * <p>Costructs a MailComposer object</p>
 * 
 * @constructor
 */
function MailComposer(){
    Stream.call(this);
    
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
 *     <li><b>sender</b> - The e-mail address of the sender. All e-mail addresses can be plain <code>sender@server.com<code> or formatted <code>Sender Name &lt;sender@server.com&gt;</code></li>
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
    var fields = ["sender", "to", "cc", "bcc", "replyTo", "subject", "body", "html"];
    
    options = options || {};
    
    var keys = Object.keys(options), key;
    for(var i=0, len=keys.length; i<len; i++){
        key = keys[i];
        if(fields.indexOf(key) >= 0){
            this._message[key] = this.handleValue(key, options[key]);
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
    
    switch(key){
        case "sender":
        case "to":
        case "cc":
        case "bcc":
        case "replyTo":
            return this.convertAddress(value);
    }
    
    return value;
};

/**
 * <p>Parses a list of semicolon separated e-mail addresses</p>
 * 
 * @param {String} value A list or single e-mail address
 * @return {Object} Parsed e-mail address list
 */
MailComposer.prototype.convertAddress = function(value){
    return value;
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
 * <p>Normalizes a key name by capitalizing first chars of words</p>
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