var testCase = require('nodeunit').testCase,
    MailComposer = require("../lib/mailcomposer").MailComposer;

exports["General tests"] = {
    
    "Create a new MailComposer object": function(test){
        var mailcomposer = new MailComposer();
        test.equal(typeof mailcomposer.on, "function");
        test.equal(typeof mailcomposer.emit, "function");
        test.done();
    },
    
    "Normalize key names": function(test){
        var normalizer = MailComposer.prototype.normalizeKey;
        
        test.equal(normalizer("abc"), "Abc");
        test.equal(normalizer("aBC"), "Abc");
        test.equal(normalizer("ABC"), "Abc");
        test.equal(normalizer("a-b-c"), "A-B-C");
        test.equal(normalizer("ab-bc"), "Ab-Bc");
        test.equal(normalizer("ab-bc-cd"), "Ab-Bc-Cd");
        test.equal(normalizer("AB-BC-CD"), "Ab-Bc-Cd");
        test.equal(normalizer("mime-version"), "MIME-Version"); // special case
        
        test.done();
    },
    
    "Add header": function(test){
        var mc = new MailComposer();
        test.equal(typeof mc._headers["Test-Key"], "undefined");
        mc.addHeader("test-key", "first");
        test.equal(mc._headers["Test-Key"], "first");
        mc.addHeader("test-key", "second");
        test.deepEqual(mc._headers["Test-Key"], ["first","second"]);
        mc.addHeader("test-key", "third");
        test.deepEqual(mc._headers["Test-Key"], ["first","second","third"]);
        test.done();
    },
    
    "Get header": function(test){
        var mc = new MailComposer();
        test.equal(mc.getHeader("MIME-Version"), "1.0");
        test.equal(mc.getHeader("test-key"), "");
        mc.addHeader("test-key", "first");
        test.equal(mc.getHeader("test-key"), "first");
        mc.addHeader("test-key", "second");
        test.deepEqual(mc.getHeader("test-key"), ["first", "second"]);
        test.done();
    },
    
    "Add message option": function(test){
        var mc = new MailComposer();
        test.equal(typeof mc._message.subject, "undefined");
        
        mc.setMessageOption({
            subject: "Test1",
            body: "Test2",
            nonexistent: "Test3"
        });
        
        test.equal(mc._message.subject, "Test1");
        test.equal(mc._message.body, "Test2");
        test.equal(typeof mc._message.nonexistent, "undefined");
        
        mc.setMessageOption({
            subject: "Test4"
        });
        
        test.equal(mc._message.subject, "Test4");
        test.equal(mc._message.body, "Test2");
        
        test.done();
    }
};
