# Discord Integration — Testing Guide

Use this guide to set up a Discord bot and test the DevCadence Discord nodes end-to-end.

---

## 1. Create a Discord Bot

- [ ] Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
- [ ] Click **New Application** and give it a name
- [ ] Open the **Bot** tab on the left sidebar
- [ ] Click **Add Bot** and confirm
- [ ] Under **Privileged Gateway Intents**, enable:
  - [ ] **MESSAGE CONTENT INTENT**
- [ ] Click **Reset Token** and copy the token (starts with `MTA...`)
- [ ] Save the token somewhere safe — you will paste it into DevCadence

---

## 2. Invite the Bot to Your Test Server

- [ ] Open the **OAuth2** tab, then **URL Generator**
- [ ] Under **Scopes**, select `bot`
- [ ] Under **Bot Permissions**, select:
  - [ ] **Send Messages**
  - [ ] **Read Messages/View Channels**
  - [ ] **Read Message History** (needed for Read Messages node)
- [ ] Copy the generated URL and open it in your browser
- [ ] Select your test server and authorize the bot

---

## 3. Get a Channel ID

- [ ] In Discord, open **User Settings** → **Advanced** and enable **Developer Mode**
- [ ] Right-click the test channel and click **Copy Channel ID**
- [ ] Save the channel ID for later

---

## 4. Get a Test User ID (for DM node)

- [ ] Right-click your own username in the member list
- [ ] Click **Copy User ID**

---

## 5. Create the Discord Connection in DevCadence

- [ ] Open [http://localhost:3000/connections](http://localhost:3000/connections)
- [ ] Click **Add Connection**
- [ ] Select **Discord**
- [ ] Paste the bot token from step 1
- [ ] Give the connection a name, e.g. `Discord Test Bot`
- [ ] Click **Connect**

---

## 6. Quick Curl Sanity Check

Run this in your terminal before testing through the UI:

```bash
CHANNEL_ID="your-channel-id"
BOT_TOKEN="your-bot-token"

curl -X POST "https://discord.com/api/v10/channels/${CHANNEL_ID}/messages" \
  -H "Authorization: Bot ${BOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"content":"DevCadence Discord node test"}'
```

- [ ] Curl returned a JSON message object (not an error)
- [ ] The test message appeared in the Discord channel

---

## 7. Test "Send Discord Message" Node

- [ ] Go to **Workflows** and create a new workflow
- [ ] Drag **Send Discord Message** from the Actions sidebar
- [ ] Select your Discord connection
- [ ] Paste the channel ID in **Channel ID**
- [ ] Write a message in **Message Content**
- [ ] Click **Test**
- [ ] Check that the message appeared in Discord

### Try with a template variable

- [ ] Add a **Build JSON** node before Send Discord Message
- [ ] Set Build JSON to `{ "name": "Alice" }`
- [ ] In Send Discord Message, set content to `Hello {{previousStep.name}}`
- [ ] Run the workflow and verify the message says `Hello Alice`

---

## 8. Test "Read Discord Messages" Node

- [ ] Create a new workflow or use the same one
- [ ] Drag **Read Discord Messages** from the Actions sidebar
- [ ] Select your Discord connection
- [ ] Paste the channel ID in **Channel ID**
- [ ] Set **Limit** to `10`
- [ ] Click **Test**
- [ ] Verify the output contains an array of messages with `id`, `content`, `author`, and `timestamp`

### Try pagination

- [ ] Copy the `id` of the newest message from the previous test
- [ ] Paste it into the **After** field
- [ ] Click **Test**
- [ ] Verify only messages newer than that ID are returned

---

## 9. Test "Send Direct Message" Node

- [ ] Create a new workflow
- [ ] Drag **Send Direct Message** from the Actions sidebar
- [ ] Select your Discord connection
- [ ] Paste your own user ID in **User ID**
- [ ] Write a message in **Message Content**
- [ ] Click **Test**
- [ ] Verify you received the DM from the bot

---

## 10. Test "Listen Discord Messages" Trigger

This trigger polls a Discord channel on a cron schedule and runs the workflow with new messages.

Requirements:

- [ ] Docker Compose running (includes Redis for the worker)
- [ ] Worker running: `npm run worker` or `docker-compose up worker`

Steps:

- [ ] Create a new workflow
- [ ] Drag **Listen Discord Messages** from the Triggers sidebar
- [ ] Select your Discord connection
- [ ] Paste the channel ID in **Channel ID**
- [ ] Set **Cron Expression** to `*/5 * * * *` (every 5 minutes)
- [ ] Set **Limit** to `50`
- [ ] Save the workflow
- [ ] Toggle the workflow status to **Active**
- [ ] Post a new message in the Discord channel
- [ ] Wait for the cron interval, then check **History**
- [ ] Verify a run was created with `messages` in the trigger payload

Notes:

- The worker remembers the last seen message ID in the `TriggerState` table.
- If no new messages are found, no run is created.
- The trigger output is `{ messages: [...] }`, same shape as Read Discord Messages.

---

## 11. Sentiment Monitor Workflow (Optional)

Build a workflow that listens for new messages and reacts to negative sentiment.

Nodes needed:

1. **Listen Discord Messages** (trigger)
   - [ ] Channel ID set
   - [ ] Cron set, e.g. `*/5 * * * *`
   - [ ] Limit set to a small number, e.g. `5`
2. **AI → Classify**
   - [ ] Select your AI connection
   - [ ] Input: `{{previousStep.messages}}`
   - [ ] Categories: `positive, neutral, negative`
3. **Conditional**
   - [ ] Condition: `previousStep.sentiment === "negative"`
4. **Send Discord Message** (on true branch)
   - [ ] Channel ID set
   - [ ] Content: `Negative sentiment detected: {{previousStep.messages[0].content}}`

- [ ] Activate the workflow, post a negative message in Discord, and verify the alert fires

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Bot token is wrong or reset | Recopy the token from the Discord Bot tab |
| `403 Missing Access` | Bot lacks permissions or was not invited to the channel | Re-invite with Send Messages + Read History |
| `404 Unknown Channel` | Channel ID is wrong | Recopy the channel ID with Developer Mode on |
| `Cannot send messages to this user` | DMs disabled or bot not in a shared server | Make sure the bot and user share a server |
| Messages array is empty | Channel has no recent messages or `after` ID is too new | Remove the `after` value or post a test message |

---

## Checklist Summary

- [ ] Bot created and token saved
- [ ] Bot invited to server with correct permissions
- [ ] Channel ID copied
- [ ] User ID copied (for DM test)
- [ ] DevCadence Discord connection created
- [ ] Curl sanity check passed
- [ ] Send Discord Message tested
- [ ] Read Discord Messages tested
- [ ] Send Direct Message tested
- [ ] Listen Discord Messages trigger tested
- [ ] Optional sentiment monitor workflow tested
