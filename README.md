# mailcomposer

**mailcomposer** is a Node.JS module for generating e-mail messages that can be streamed to SMTP or file.

[![Build Status](https://secure.travis-ci.org/andris9/mailcomposer.png)](http://travis-ci.org/andris9/mailcomposer)

## Support mailcomposer development

[![Donate to author](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=DB26KWR2BQX5W)

## Installation

Install through NPM

    npm install mailcomposer

## Usage

### Include mailcomposer module

```javascript
var MailComposer = require("mailcomposer").MailComposer;
```

### Create a new `MailComposer` instance

```javascript
var mailcomposer = new MailComposer(mailOptions);
```

Where `mailOptions` is an object that defines the components of the message

## API

### compile

To create a stream that outputs a raw rfc822 message from the defined input, use `compile()`

```javascript
    var mailcomposer = new MailComposer({from: '...', ...});
    var stream = mailcomposer.compile();
    stream.pipe(process.stdout);
```

## License

**MIT**
