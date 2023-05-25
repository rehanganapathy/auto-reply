const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const gmail = google.gmail('v1');
const dotenv = require('dotenv');
dotenv.config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const GMAIL_ID = process.env.GMAIL_ID;

const oauthclient = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauthclient.setCredentials({ refresh_token: REFRESH_TOKEN });
//check for emails received
async function emailCheck() {
    try {
        const accessToken = await oauthclient.getAccessToken()
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_ID,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: process.env.ACCESS_TOKEN,
            },
        });
        const gmail = google.gmail({
            version: 'v1',
            auth: oauthclient
        });
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
            maxResults: 1,
        });
        const messages = res.data.messages || [];
        for (const message of messages) {
            const res = await gmail.users.threads.get({
                userId: 'me',
                id: message.threadId,
            });
            const thread = res.data;
            const isReply = thread.messages.some(
                m => m.labelIds.includes('SENT') && m.from.emailAddress === 'rehanganapathy1710@gmail.com'
            );
            const msgsender = thread.messages[0].payload.headers.find(header => header.name === 'From').value;

            if (!isReply) {
                const mailOptions = {
                    from: GMAIL_ID,
                    to: thread.messages[0].payload.headers.find(header => header.name === 'From').value,
                    //get name from the email
                    subject: 'Hey ' + msgsender.substring(0, msgsender.indexOf('<')),
                    text: 'I am on a vacation.',
                };
                const result = await transporter.sendMail(mailOptions);
                console.log(`Email sent to user ${mailOptions.to}`);
                const messageId = res.data.messages[0].id;
                const labelName = "Listed";
                const response = await gmail.users.messages.list({
                    userId: 'me',
                    maxResults: 1,
                    q: 'in:inbox',
                });


                // Get the message id which we will need to archive/delete it.
                const labelsResponse = await gmail.users.labels.list({ userId: "me" });
                const labels = labelsResponse.data.labels;
                let labelId = null;
                for (let i = 0; i < labels.length; i++) {
                    if (labels[i].name === labelName) {
                        labelId = labels[i].id;
                        break;
                    }
                }

                // If the label doesn't exist, create it
                if (!labelId) {
                    const createLabelResponse = await gmail.users.labels.create({
                        userId: "me",
                        requestBody: {
                            name: labelName,
                            labelListVisibility: "labelShow",
                            messageListVisibility: "show",
                        },
                    });
                    labelId = createLabelResponse.data.id;
                }
                // Append a label to the email
                await gmail.users.messages.modify({
                    userId: "me",
                    id: messageId,
                    requestBody: {
                        addLabelIds: [labelId],
                        removeLabelIds: ['INBOX', 'UNREAD'],
                    },
                });
            }
        }

    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

emailCheck().then((result) => console.log('Email sending done')).catch((error) => console.log(error.message));
setInterval(emailCheck, Math.ceil(Math.random() * (120000 - 45000) + 45000));