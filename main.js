const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const gmail = google.gmail('v1');


const GMAIL_ID = 'rehanganapathy1710@gmail.com';
const CLIENT_ID = '184344738888-v7f7p3utg1q1ti992han8kfdi57om2ac.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = '1//04aQBmcfdJXhXCgYIARAAGAQSNwF-L9Irku50B2VObm2cTGUNJ02-LYikp_mRVe72nGf0TewZJZFShz1X5T095UcYb73ftoLJK5k';

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
//check for emails received
async function emailCheck() {
    try {
        const accessToken = await oAuth2Client.getAccessToken()
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: GMAIL_ID,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });
        const gmail = google.gmail({
            version: 'v1',
            auth: oAuth2Client
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