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
    
    /**
     * <p>Contains all header values</p>
     * @private
     */
    this._headers = {};
    
    this.init();
}
utillib.inherits(MailComposer, Stream);

/**
 * <p>Resets and initializes MailComposer</p>
 */
MailComposer.prototype.init = function(){
    this._headers = {};
    this.addHeader("MIME-Version", "1.0");
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