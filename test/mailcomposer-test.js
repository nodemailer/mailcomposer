'use strict';

var chai = require('chai');
var mailcomposer = require('../lib/mailcomposer');
var MailComposer = mailcomposer.MailComposer;
var sinon = require('sinon');
var expect = chai.expect;

chai.config.includeStack = true;

describe('MailComposer unit tests', function() {
    it('should create new MailComposer', function() {
        expect(new MailComposer({})).to.exist;
        expect(mailcomposer({})).to.exist;
    });

    describe('#compile', function() {
        it('should use Mixed structure with text and attachment', function() {
            var data = {
                text: 'abc',
                attachments: [{
                    content: 'abc'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createMixed');
            compiler.compile();
            expect(compiler._createMixed.callCount).to.equal(1);
            compiler._createMixed.restore();
        });

        it('should use Mixed structure with multiple attachments', function() {
            var data = {
                attachments: [{
                    content: 'abc'
                }, {
                    content: 'def'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createMixed');
            compiler.compile();
            expect(compiler._createMixed.callCount).to.equal(1);
            compiler._createMixed.restore();
        });

        it('should create Alternative structure with text and html', function() {
            var data = {
                text: 'abc',
                html: 'def'
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);

            expect(compiler._alternatives.length).to.equal(2);
            expect(compiler._alternatives[0].contentType).to.equal('text/plain');
            expect(compiler._alternatives[1].contentType).to.equal('text/html');

            compiler._createAlternative.restore();
        });

        it('should create Alternative structure with text, watchHtml and html', function() {
            var data = {
                text: 'abc',
                html: 'def',
                watchHtml: 'ghi'
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            expect(compiler._alternatives.length).to.equal(3);
            expect(compiler._alternatives[0].contentType).to.equal('text/plain');
            expect(compiler._alternatives[1].contentType).to.equal('text/watch-html');
            expect(compiler._alternatives[2].contentType).to.equal('text/html');
            compiler._createAlternative.restore();
        });

        it('should create Alternative structure with text, html and cid attachment', function() {
            var data = {
                text: 'abc',
                html: 'def',
                attachments: [{
                    content: 'abc',
                    cid: 'aaa'
                }, {
                    content: 'def',
                    cid: 'bbb'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            compiler._createAlternative.restore();
        });

        it('should create Related structure with html and cid attachment', function() {
            var data = {
                html: 'def',
                attachments: [{
                    content: 'abc',
                    cid: 'aaa'
                }, {
                    content: 'def',
                    cid: 'bbb'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createRelated');
            compiler.compile();
            expect(compiler._createRelated.callCount).to.equal(1);
            compiler._createRelated.restore();
        });

        it('should create content node with only text', function() {
            var data = {
                text: 'def'
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createContentNode');
            compiler.compile();
            expect(compiler._createContentNode.callCount).to.equal(1);
            compiler._createContentNode.restore();
        });

        it('should create content node with only an attachment', function() {
            var data = {
                attachments: [{
                    content: 'abc',
                    cid: 'aaa'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.stub(compiler, '_createContentNode');
            compiler.compile();
            expect(compiler._createContentNode.callCount).to.equal(1);
            compiler._createContentNode.restore();
        });

        it('should create content node with encoded buffer', function() {
            var str = 'tere tere';
            var data = {
                text: {
                    content: new Buffer(str).toString('base64'),
                    encoding: 'base64'
                }
            };

            var compiler = new MailComposer(data);
            compiler.compile();
            expect(compiler.message.content).to.deep.equal(new Buffer(str));
        });

        it('should create content node from data url', function() {
            var str = 'tere tere';
            var data = {
                attachments: [{
                    href: 'data:image/png,tere%20tere'
                }]
            };

            var compiler = new MailComposer(data);
            compiler.compile();
            expect(compiler.mail.attachments[0].content).to.deep.equal(new Buffer(str));
            expect(compiler.mail.attachments[0].contentType).to.equal('image/png');
        });

        it('should create the same output', function(done) {
            var data = {
                text: 'abc',
                html: 'def',
                baseBoundary: 'test',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: multipart/alternative; boundary="----sinikael-?=_1-test"\r\n' +
                'Message-Id: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'abc\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/html\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'def\r\n' +
                '------sinikael-?=_1-test--\r\n';

            var mail = mailcomposer(data);
            mail.build(function(err, message){
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should discard BCC', function(done) {
            var data = {
                from:'test1@example.com',
                to:'test2@example.com',
                bcc:'test3@example.com',
                text: 'def',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: text/plain\r\n' +
                'From: test1@example.com\r\n' +
                'To: test2@example.com\r\n' +
                'Message-Id: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'def';

            var mail = mailcomposer(data);
            mail.build(function(err, message){
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should keep BCC', function(done) {
            var data = {
                from:'test1@example.com',
                to:'test2@example.com',
                bcc:'test3@example.com',
                text: 'def',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: text/plain\r\n' +
                'From: test1@example.com\r\n' +
                'To: test2@example.com\r\n' +
                'Bcc: test3@example.com\r\n' +
                'Message-Id: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'def';

            var mail = mailcomposer(data);
            mail.keepBcc = true;
            mail.build(function(err, message){
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });
    });
});
