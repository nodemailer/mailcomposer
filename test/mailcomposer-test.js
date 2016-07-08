/* eslint no-unused-expressions:0 */
/* globals describe, it */

'use strict';

var chai = require('chai');
var mailcomposer = require('../lib/mailcomposer');
var MailComposer = mailcomposer.MailComposer;
var sinon = require('sinon');
var expect = chai.expect;

chai.config.includeStack = true;

describe('MailComposer unit tests', function () {
    it('should create new MailComposer', function () {
        expect(new MailComposer({})).to.exist;
        expect(mailcomposer({})).to.exist;
    });

    describe('#compile', function () {
        it('should use Mixed structure with text and attachment', function () {
            var data = {
                text: 'abc',
                attachments: [{
                    content: 'abc'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createMixed');
            compiler.compile();
            expect(compiler._createMixed.callCount).to.equal(1);
            compiler._createMixed.restore();
        });

        it('should use Mixed structure with multiple attachments', function () {
            var data = {
                attachments: [{
                    content: 'abc'
                }, {
                    content: 'def'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createMixed');
            compiler.compile();
            expect(compiler._createMixed.callCount).to.equal(1);
            compiler._createMixed.restore();
        });

        it('should create Alternative structure with text and html', function () {
            var data = {
                text: 'abc',
                html: 'def'
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);

            expect(compiler._alternatives.length).to.equal(2);
            expect(compiler._alternatives[0].contentType).to.equal('text/plain');
            expect(compiler._alternatives[1].contentType).to.equal('text/html');

            compiler._createAlternative.restore();
        });

        it('should create Alternative structure with text, watchHtml and html', function () {
            var data = {
                text: 'abc',
                html: 'def',
                watchHtml: 'ghi'
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            expect(compiler._alternatives.length).to.equal(3);
            expect(compiler._alternatives[0].contentType).to.equal('text/plain');
            expect(compiler._alternatives[1].contentType).to.equal('text/watch-html');
            expect(compiler._alternatives[2].contentType).to.equal('text/html');
            compiler._createAlternative.restore();
        });

        it('should create Alternative structure with text, icalEvent and html', function () {
            var data = {
                text: 'abc',
                html: 'def',
                icalEvent: 'ghi'
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            expect(compiler._alternatives.length).to.equal(3);
            expect(compiler._alternatives[0].contentType).to.equal('text/plain');
            expect(compiler._alternatives[1].contentType).to.equal('text/html');
            expect(compiler._alternatives[2].contentType).to.equal('text/calendar; charset="utf-8"; method=PUBLISH');
            compiler._createAlternative.restore();
        });

        it('should create Alternative structure with text, html and cid attachment', function () {
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
            sinon.spy(compiler, '_createAlternative');
            compiler.compile();
            expect(compiler._createAlternative.callCount).to.equal(1);
            compiler._createAlternative.restore();
        });

        it('should create Related structure with html and cid attachment', function () {
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
            sinon.spy(compiler, '_createRelated');
            compiler.compile();
            expect(compiler._createRelated.callCount).to.equal(1);
            compiler._createRelated.restore();
        });

        it('should create content node with only text', function () {
            var data = {
                text: 'def'
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createContentNode');
            compiler.compile();
            expect(compiler._createContentNode.callCount).to.equal(1);
            compiler._createContentNode.restore();
        });

        it('should create content node with only an attachment', function () {
            var data = {
                attachments: [{
                    content: 'abc',
                    cid: 'aaa'
                }]
            };

            var compiler = new MailComposer(data);
            sinon.spy(compiler, '_createContentNode');
            compiler.compile();
            expect(compiler._createContentNode.callCount).to.equal(1);
            compiler._createContentNode.restore();
        });

        it('should create content node with encoded buffer', function () {
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

        it('should create content node from data url', function () {
            var str = 'tere tere';
            var data = {
                attachments: [{
                    href: 'data:image/png,tere%20tere'
                }]
            };

            var compiler = new MailComposer(data);
            var mail = compiler.compile();
            expect(mail.messageId()).to.exist;
            expect(compiler.mail.attachments[0].content).to.deep.equal(new Buffer(str));
            expect(compiler.mail.attachments[0].contentType).to.equal('image/png');
        });

        it('should create the same output', function (done) {
            var data = {
                text: 'abc',
                html: 'def',
                baseBoundary: 'test',
                messageId: '<zzzzzz>',
                headers: {
                    'x-processed': 'a really long header or value with non-ascii characters 👮',
                    'x-unprocessed': {
                        prepared: true,
                        value: 'a really long header or value with non-ascii characters 👮'
                    }
                },
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: multipart/alternative; boundary="----sinikael-?=_1-test"\r\n' +
                'X-Processed: a really long header or value with non-ascii characters\r\n' +
                ' =?UTF-8?Q?=F0=9F=91=AE?=\r\n' +
                'X-Unprocessed: a really long header or value with non-ascii characters 👮\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
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
            expect(mail.messageId()).to.equal('<zzzzzz>');
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should use raw input for the message', function (done) {
            var data = {
                raw: 'test test test',
                envelope: {
                    from: 'Daemon <deamon@kreata.ee>',
                    to: 'mailer@kreata.ee, Mailer <mailer2@kreata.ee>'
                }
            };

            var expected = 'test test test';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(mail.getEnvelope()).to.deep.equal({
                    from: 'deamon@kreata.ee',
                    to: ['mailer@kreata.ee', 'mailer2@kreata.ee']
                });
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should use raw input for different parts', function (done) {
            var data = {
                from: 'test1@example.com',
                to: 'test2@example.com',
                bcc: 'test3@example.com',
                text: {
                    raw: 'rawtext'
                },
                html: {
                    raw: 'rawhtml'
                },
                watchHtml: {
                    raw: 'rawwatch'
                },
                messageId: 'rawtest',
                icalEvent: {
                    raw: 'rawcalendar'
                },
                attachments: [{
                    raw: 'rawattachment'
                }],
                alternatives: [{
                    raw: 'rawalternative'
                }],
                date: 'Sat, 21 Jun 2014 10:52:44 +0000',
                baseBoundary: 'test'
            };

            var expected = 'Content-Type: multipart/mixed; boundary="----sinikael-?=_1-test"\r\n' +
                'From: test1@example.com\r\n' +
                'To: test2@example.com\r\n' +
                'Message-ID: <rawtest>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: multipart/alternative; boundary="----sinikael-?=_2-test"\r\n' +
                '\r\n' +
                '------sinikael-?=_2-test\r\n' +
                'rawtext\r\n' +
                '------sinikael-?=_2-test\r\n' +
                'rawwatch\r\n' +
                '------sinikael-?=_2-test\r\n' +
                'rawhtml\r\n' +
                '------sinikael-?=_2-test\r\n' +
                'rawcalendar\r\n' +
                '------sinikael-?=_2-test\r\n' +
                'rawalternative\r\n' +
                '------sinikael-?=_2-test--\r\n' +
                '\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'rawattachment\r\n' +
                '------sinikael-?=_1-test--\r\n';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should discard BCC', function (done) {
            var data = {
                from: 'test1@example.com',
                to: 'test2@example.com',
                bcc: 'test3@example.com',
                text: 'def',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: text/plain\r\n' +
                'From: test1@example.com\r\n' +
                'To: test2@example.com\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'def';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should autodetect text encoding', function (done) {
            var data = {
                from: 'ÄÄÄÄ test1@example.com',
                to: 'AAAÄ test2@example.com',
                subject: 'def ÄÄÄÄ foo AAAÄ',
                text: 'def ÄÄÄÄ foo AAAÄ',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                'From: =?UTF-8?B?w4TDhMOEw4Q=?= <test1@example.com>\r\n' +
                'To: =?UTF-8?Q?AAA=C3=84?= <test2@example.com>\r\n' +
                'Subject: def =?UTF-8?Q?=C3=84=C3=84=C3=84=C3=84?= foo =?UTF-8?Q?AAA=C3=84?=\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: quoted-printable\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'def =C3=84=C3=84=C3=84=C3=84 foo AAA=C3=84';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should use quoted-printable text encoding', function (done) {
            var data = {
                from: 'ÄÄÄÄ test1@example.com',
                to: 'AAAÄ test2@example.com',
                subject: 'def ÄÄÄÄ foo AAAÄ',
                text: 'def ÄÄÄÄ foo AAAÄ',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000',
                textEncoding: 'quoted-printable'
            };

            var expected = '' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                'From: =?UTF-8?Q?=C3=84=C3=84=C3=84=C3=84?= <test1@example.com>\r\n' +
                'To: =?UTF-8?Q?AAA=C3=84?= <test2@example.com>\r\n' +
                'Subject: def =?UTF-8?Q?=C3=84=C3=84=C3=84=C3=84?= foo =?UTF-8?Q?AAA=C3=84?=\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: quoted-printable\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'def =C3=84=C3=84=C3=84=C3=84 foo AAA=C3=84';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should use base64 text encoding', function (done) {
            var data = {
                from: 'ÄÄÄÄ test1@example.com',
                to: 'AAAÄ test2@example.com',
                subject: 'def ÄÄÄÄ foo AAAÄ',
                text: 'def ÄÄÄÄ foo AAAÄ',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000',
                textEncoding: 'base64'
            };

            var expected = '' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                'From: =?UTF-8?B?w4TDhMOEw4Q=?= <test1@example.com>\r\n' +
                'To: =?UTF-8?B?QUFBw4Q=?= <test2@example.com>\r\n' +
                'Subject: def =?UTF-8?B?w4TDhMOEw4Q=?= foo =?UTF-8?B?QUFBw4Q=?=\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'ZGVmIMOEw4TDhMOEIGZvbyBBQUHDhA==';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should keep BCC', function (done) {
            var data = {
                from: 'test1@example.com',
                to: 'test2@example.com',
                bcc: 'test3@example.com',
                text: 'def',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000'
            };

            var expected = '' +
                'Content-Type: text/plain\r\n' +
                'From: test1@example.com\r\n' +
                'To: test2@example.com\r\n' +
                'Bcc: test3@example.com\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                'def';

            var mail = mailcomposer(data);
            mail.keepBcc = true;
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should set headers for attachment', function (done) {
            var data = {
                text: 'abc',
                baseBoundary: 'test',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000',
                attachments: [{
                    headers: {
                        'X-Test-1': 12345,
                        'X-Test-2': 'ÕÄÖÜ',
                        'X-Test-3': ['foo', 'bar']
                    },
                    content: 'test',
                    filename: 'test.txt'
                }]
            };

            var expected = '' +
                'Content-Type: multipart/mixed; boundary="----sinikael-?=_1-test"\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'abc\r\n-' +
                '-----sinikael-?=_1-test\r\n' +
                'Content-Type: text/plain; name=test.txt\r\n' +
                'X-Test-1: 12345\r\n' +
                'X-Test-2: =?UTF-8?B?w5XDhMOWw5w=?=\r\n' +
                'X-Test-3: foo\r\n' +
                'X-Test-3: bar\r\n' +
                'Content-Disposition: attachment; filename=test.txt\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'test\r\n' +
                '------sinikael-?=_1-test--\r\n';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should ignore attachment filename', function (done) {
            var data = {
                text: 'abc',
                baseBoundary: 'test',
                messageId: 'zzzzzz',
                date: 'Sat, 21 Jun 2014 10:52:44 +0000',
                attachments: [{
                    content: 'test',
                    filename: 'test.txt'
                }, {
                    content: 'test2',
                    filename: false
                }]
            };

            var expected = '' +
                'Content-Type: multipart/mixed; boundary="----sinikael-?=_1-test"\r\n' +
                'Message-ID: <zzzzzz>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'abc\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/plain; name=test.txt\r\n' +
                'Content-Disposition: attachment; filename=test.txt\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'test\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: application/octet-stream\r\n' +
                'Content-Disposition: attachment\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                'dGVzdDI=\r\n' +
                '------sinikael-?=_1-test--\r\n';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });

        it('should add ical alternative', function (done) {
            var data = {
                from: 'test1@example.com',
                to: 'test2@example.com',
                bcc: 'test3@example.com',
                text: 'def',
                messageId: 'icaltest',
                icalEvent: {
                    method: 'request',
                    content: new Buffer('test').toString('hex'),
                    encoding: 'hex'
                },
                date: 'Sat, 21 Jun 2014 10:52:44 +0000',
                baseBoundary: 'test'
            };

            var expected = '' +
                'Content-Type: multipart/alternative; boundary="----sinikael-?=_1-test"\r\n' +
                'From: test1@example.com\r\n' +
                'To: test2@example.com\r\n' +
                'Message-ID: <icaltest>\r\n' +
                'Date: Sat, 21 Jun 2014 10:52:44 +0000\r\n' +
                'MIME-Version: 1.0\r\n' +
                '\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: 7bit\r\n' +
                '\r\n' +
                'def\r\n' +
                '------sinikael-?=_1-test\r\n' +
                'Content-Type: text/calendar; charset=utf-8; method=REQUEST\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                'dGVzdA==\r\n' +
                '------sinikael-?=_1-test--\r\n';

            var mail = mailcomposer(data);
            mail.build(function (err, message) {
                expect(err).to.not.exist;
                expect(message.toString()).to.equal(expected);
                done();
            });
        });
    });
});
