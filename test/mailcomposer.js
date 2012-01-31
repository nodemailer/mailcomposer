var testCase = require('nodeunit').testCase,
    MailComposer = require("../lib/mailcomposer").MailComposer,
    toPunycode = require("../lib/punycode");

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
    },
    
    "Detect mime type": function(test){
        var mc = new MailComposer();
        
        test.equal(mc.getMimeType("test.txt"), "text/plain");
        test.equal(mc.getMimeType("test.unknown"), "application/octet-stream");
        
        test.done();
    }
};


exports["Text encodings"] = {
    "Punycode": function(test){
        test.equal(toPunycode("andris@age.ee"), "andris@age.ee");
        test.equal(toPunycode("andris@äge.ee"), "andris@xn--ge-uia.ee");
        test.done();
    },
    
    "Mime words": function(test){
        var mc = new MailComposer();
        test.equal(mc.encodeMimeWord("Tere"), "Tere");
        test.equal(mc.encodeMimeWord("Tere","Q"), "Tere");
        test.equal(mc.encodeMimeWord("Tere","B"), "Tere");
        
        // simple
        test.equal(mc.encodeMimeWord("äss"), "=?UTF-8?Q?=C3=A4ss?=");
        test.equal(mc.encodeMimeWord("äss","B"), "=?UTF-8?B?"+(new Buffer("äss","utf-8").toString("base64"))+"?=");
        
        //multiliple
        test.equal(mc.encodeMimeWord("äss tekst on see siin või kuidas?","Q", 20), "=?UTF-8?Q?=C3=A4ss_t?= =?UTF-8?Q?ekst_on_see_siin_v=C?= =?UTF-8?Q?3=B5i_kuidas=3F?=");
        
        test.done();
    },
    
    "Addresses": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>'
        });

        test.equal(mc._message.from, "\"=?UTF-8?Q?Jaanuar_Veebruar,_M=C3=A4rts?=\" <=?UTF-8?Q?m=C3=A4rts?=@xn--mrts-loa.eu>");
        
        mc.setMessageOption({
            sender: 'aavik <aavik@node.ee>'
        });
        
        test.equal(mc._message.from, '"aavik" <aavik@node.ee>');
        
        mc.setMessageOption({
            sender: '<aavik@node.ee>'
        });
        
        test.equal(mc._message.from, 'aavik@node.ee');
        
        mc.setMessageOption({
            sender: '<aavik@märts.eu>'
        });
        
        test.equal(mc._message.from, 'aavik@xn--mrts-loa.eu');
        
        // multiple
        
        mc.setMessageOption({
            sender: '<aavik@märts.eu>, juulius@node.ee, "Node, Master" <node@node.ee>'
        });
        
        test.equal(mc._message.from, 'aavik@xn--mrts-loa.eu, juulius@node.ee, "Node, Master" <node@node.ee>');
        
        test.done();
    },
    
    "Invalid subject": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            subject: "tere\ntere!"
        });
        
        test.equal(mc._message.subject, "tere tere!");
        test.done();
    },
    
    "Long header line": function(test){
        var mc = new MailComposer();
        
        mc._headers = {
            From: "a very log line, \"=?UTF-8?Q?Jaanuar_Veebruar,_M=C3=A4rts?=\" <=?UTF-8?Q?m=C3=A4rts?=@xn--mrts-loa.eu>"
        };
        
        mc.on("data", function(chunk){
            test.ok(chunk.toString().trim().match(/From\:\s[^\r\n]+\r\n\s+[^\r\n]+/));
            test.done();
        });
        mc.composeHeader();
        
    }
    
};

exports["Mail related"] = {
    "Envelope": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>',
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>'
        });

        test.deepEqual(mc._envelope, {from:[ 'märts@xn--mrts-loa.eu' ],to:[ 'aavik@xn--mrts-loa.eu', 'juulius@node.ee'], cc:['node@node.ee' ]});
        test.done();
    },
    
    "Add attachment": function(test){
        var mc = new MailComposer();
        mc.addAttachment();
        test.equal(mc._attachments.length, 0);
        
        mc.addAttachment({filePath:"/tmp/var.txt"});
        test.equal(mc._attachments[0].contentType, "text/plain");
        
        mc.addAttachment({contents:"/tmp/var.txt"});
        test.equal(mc._attachments[1].contentType, "application/octet-stream");
        
        test.done();
    },
    
    "Emit envelope": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>, karu@ahven.ee',
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>'
        });
        
        mc.on("envelope", function(envelope){
            test.deepEqual(envelope, {from: 'märts@xn--mrts-loa.eu',to:[ 'aavik@xn--mrts-loa.eu', 'juulius@node.ee', 'node@node.ee' ]});
            test.done();
        });

        mc.composeEnvelope();
        
    },
    
    "Generate Headers": function(test){
        var mc = new MailComposer();
        mc.setMessageOption({
            sender: '"Jaanuar Veebruar, Märts" <märts@märts.eu>, karu@ahven.ee',
            to: '<aavik@märts.eu>, juulius@node.ee',
            cc: '"Node, Master" <node@node.ee>',
            replyTo: 'julla@pulla.ee',
            subject: "Tere õkva!"
        });

        mc.on("data", function(chunk){
            chunk = (chunk || "").toString("utf-8");
            test.ok(chunk.match(/^(?:(?:[\s]+|[a-zA-Z0-0\-]+\:)[^\r\n]+\r\n)+\r\n$/));
            test.done();
        });

        mc.composeHeader();
    }
};

exports["Mime tree"] = {
    "No contents": function(test){
        test.expect(4);
        
        var mc = new MailComposer();
        mc.composeMessage();
        
        test.ok(!mc._message.tree.boundary);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "text/plain");
        test.equal(mc._message.tree.childNodes.length, 0);
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "\r\n");
            }
        }
        
        test.done();
    },
    "Text contents": function(test){
        test.expect(4);
        
        var mc = new MailComposer();
        mc.setMessageOption({
            body: "test"
        });
        mc.composeMessage();
        
        test.ok(!mc._message.tree.boundary);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "text/plain");
        test.equal(mc._message.tree.childNodes.length, 0);
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }
        
        test.done();
    },
    "HTML contents": function(test){
        test.expect(4);
        
        var mc = new MailComposer();
        mc.setMessageOption({
            html: "<b>test</b>"
        });
        mc.composeMessage();
        
        test.ok(!mc._message.tree.boundary);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "text/html");
        test.equal(mc._message.tree.childNodes.length, 0);
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "<b>test</b>");
            }
        }
        
        test.done();
    },
    "HTML and text contents": function(test){
        test.expect(5);
        
        var mc = new MailComposer();
        mc.setMessageOption({
            body: "test",
            html: "test"
        });
        mc.composeMessage();
        
        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "multipart/alternative");
        test.ok(mc._message.tree.boundary);
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }
        
        test.done();
    },
    "Attachment": function(test){
        test.expect(5);
        
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"\r\n"});
        mc.composeMessage();
        
        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "\r\n");
            }
        }
        
        test.done();
    },
    "Several attachments": function(test){
        test.expect(6);
        
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"\r\n"});
        mc.addAttachment({contents:"\r\n"});
        mc.composeMessage();
        
        test.equal(mc._message.tree.childNodes.length, 3);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "\r\n");
            }
        }
        
        test.done();
    },
    "Attachment and text": function(test){
        test.expect(7);
        
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"test"});
        mc.setMessageOption({
            body: "test"
        });
        mc.composeMessage();
        
        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);
        
        mc._message.tree.childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/plain");
            }
        });
        
        mc._message.tree.childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "application/octet-stream");
            }
        });
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }
        
        test.done();
    },
    "Attachment and html": function(test){
        test.expect(7);
        
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"test"});
        mc.setMessageOption({
            html: "test"
        });
        mc.composeMessage();
        
        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);
        
        mc._message.tree.childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/html");
            }
        });
        
        mc._message.tree.childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "application/octet-stream");
            }
        });
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }
        
        test.done();
    },
    "Attachment, html and text": function(test){
        test.expect(11);
        
        var mc = new MailComposer();
        mc.setMessageOption();
        mc.addAttachment({contents:"test"});
        mc.setMessageOption({
            body: "test",
            html: "test"
        });
        mc.composeMessage();
        
        test.equal(mc._message.tree.childNodes.length, 2);
        test.equal(mc.getHeader("Content-Type").split(";").shift().trim(), "multipart/mixed");
        test.ok(mc._message.tree.boundary);
        
        mc._message.tree.childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "multipart/alternative");
            }
        });
        
        test.ok(mc._message.tree.childNodes[0].boundary);
        
        mc._message.tree.childNodes[0].childNodes[0].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/plain");
            }
        });
        
        mc._message.tree.childNodes[0].childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "text/html");
            }
        });
        
        mc._message.tree.childNodes[1].headers.forEach(function(header){
            if(header[0]=="Content-Type"){
                test.equal(header[1].split(";").shift().trim(), "application/octet-stream");
            }
        });
        
        for(var i=0, len = mc._message.flatTree.length; i<len; i++){
            if(typeof mc._message.flatTree[i] == "object"){
                test.equal(mc._message.flatTree[i].contents, "test");
            }
        }
        
        test.done();
    }
    
};

