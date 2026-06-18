# ServiceOps Platform — User Guide

**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** June 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Asset Management](#asset-management)
3. [Monitoring](#monitoring)
4. [Alerts & Incidents](#alerts--incidents)
5. [Notifications](#notifications)
6. [SLA Tracking](#sla-tracking)
7. [Topology](#topology)
8. [Logs](#logs)
9. [API Usage](#api-usage)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### First Login

**Default Credentials:**
```
Email: admin@serviceops.local
Password: admin123
```

**After Login:**
1. Dashboard shows system overview
2. Navigate using sidebar menu
3. Change password in Settings
4. Start creating assets

### Docker Deployment

```bash
# Start all services
make docker-up

# Access
# Frontend: http://localhost:5173
# Backend: http://localhost:9080
# Login: admin@serviceops.local / admin123

# Stop services
make docker-down
```

### Local Development

```bash
# Start database
docker compose up -d postgres

# Backend (terminal 1)
cd backend
uv sync
PORT=9080 python run_server.py

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

---

## Asset Management

### What is an Asset?

An asset represents any IT resource you want to monitor:
- **Servers** — Physical or virtual machines
- **Databases** — PostgreSQL, MySQL, MongoDB, etc.
- **APIs** — REST/GraphQL endpoints
- **Caches** — Redis, Memcached
- **Queues** — RabbitMQ, Kafka
- **Load Balancers** — nginx, HAProxy
- **Storage** — S3, NFS, SAN
- **Other** — Custom assets

### Create Asset

**Steps:**
1. Go to **Assets** page
2. Click **+ New Asset** button
3. Fill in details:
   - **Name:** e.g., "Production API Server"
   - **Type:** Select from dropdown (Server, Database, API, etc.)
   - **Description:** Optional details
   - **Metadata:** JSON tags (environment, region, owner)
4. Click **Save**

**Example Metadata:**
```json
{
  "environment": "production",
  "region": "jakarta",
  "owner": "devops-team",
  "cost_center": "engineering"
}
```

### Filter Assets

**Available Filters:**
- By **Type** (dropdown)
- By **Status** (healthy/warning/critical)
- By **Name** (search box)
- By **Metadata** (custom tags)

Cross-menu filtering works across Assets, Alerts, Monitoring, Incidents pages.

### Edit Asset

1. Click asset row in table
2. Click **Edit** button
3. Update fields
4. Click **Save**

### Delete Asset

1. Click asset row
2. Click **Delete** button
3. Confirm deletion

**Warning:** Deleting an asset also deletes:
- All monitoring checks
- Alert rules
- Incident history

---

## Monitoring

### What is a Check?

A monitoring check is an automated test that runs periodically:
- **HTTP Check** — Verify endpoint status + response time
- **Ping Check** — ICMP connectivity + latency
- **SSL Check** — Certificate expiry tracking
- **TCP Check** — Port availability

### Create HTTP Check

**Steps:**
1. Go to **Monitoring** page
2. Click **+ New Check**
3. Fill in:
   - **Asset:** Select target asset
   - **Check Type:** HTTP
   - **Name:** e.g., "API Health Check"
   - **URL:** http://api.example.com/health
   - **Method:** GET (or POST)
   - **Expected Status:** 200
   - **Timeout:** 5 seconds
   - **Interval:** 60 seconds (how often to run)
4. Enable toggle: **ON**
5. Click **Save**

**Result:** Check executes every 60 seconds, stores results.

### Create Ping Check

**Steps:**
1. Click **+ New Check**
2. Check Type: **Ping**
3. **Target:** hostname or IP address
4. **Timeout:** 5 seconds
5. **Interval:** 300 seconds (5 minutes)
6. Enable: **ON**
7. Click **Save**

### Create SSL Check

**Steps:**
1. Click **+ New Check**
2. Check Type: **SSL**
3. **Host:** example.com
4. **Port:** 443
5. **Interval:** 3600 seconds (1 hour)
6. Enable: **ON**
7. Click **Save**

**Result:** Checks certificate expiry, alerts when < 30 days remaining.

### View Check Results

1. Click check row in Monitoring table
2. Click **View Results** tab
3. See last 50 executions:
   - **Status:** success/failure
   - **Response Time:** milliseconds
   - **Timestamp:** when executed
   - **Error:** if failed

### Disable Check

Temporarily pause monitoring without deleting:
1. Click check row
2. Toggle **Enabled** switch to OFF
3. Check pauses immediately
4. Re-enable anytime

---

## Alerts & Incidents

### Alert Rule vs Incident

**Alert Rule:**
- Condition that triggers when met
- Example: "HTTP status != 200"
- Linked to monitoring check
- Can be enabled/disabled

**Incident:**
- Actual event created when rule fires
- Has lifecycle: triggered → acknowledged → resolved
- Contains timeline + comments

### Create Alert Rule

**Steps:**
1. Go to **Alerts** page
2. Click **+ New Rule**
3. Fill in:
   - **Check:** Select monitoring check
   - **Name:** e.g., "API Health Critical"
   - **Condition:** status_code != 200
   - **Severity:** critical (or warning/info)
   - **Threshold:** 1 (trigger on 1st failure)
4. Enable toggle: **ON**
5. Click **Save**

**Condition Examples:**
- `status_code != 200` — HTTP failure
- `response_time > 3000` — Slow response (> 3 seconds)
- `check_failed` — Any failure

### Incident Lifecycle

**1. Triggered**
- Rule condition met
- Incident auto-created
- Status: **Open**
- Notification sent (if channel configured)

**2. Acknowledged**
- Team member marks as "seen"
- Status: **Acknowledged**
- Optional note: "Investigating..."

**3. Resolved**
- Issue fixed
- Status: **Resolved**
- Resolution note: "Restarted service"

### Acknowledge Incident

1. Go to **Incidents** page
2. Click incident row
3. Click **Acknowledge** button
4. Add note (optional): "Investigating..."
5. Click **Save**

**Result:** Incident marked as acknowledged, team notified.

### Resolve Incident

1. Click incident row
2. Click **Resolve** button
3. Add resolution note: "Fixed by restarting API"
4. Click **Save**

**Result:** Incident closed, downtime calculated for SLA.

### View Incident Timeline

1. Click incident row
2. Click **Timeline** tab
3. See full history:
   - Created timestamp
   - Acknowledged (who, when)
   - Comments from team
   - Resolved (who, when, note)

### Add Comment to Incident

1. Click incident row
2. Click **Timeline** tab
3. Scroll to bottom
4. Enter comment text
5. Click **Add Comment**

**Use for:** Status updates, investigation notes, handoff messages.

---

## Notifications

### Supported Channels

- **Telegram** — Bot-based instant alerts (recommended)
- **Discord** — Webhook integration
- **Email** — SMTP (Gmail, Outlook, etc.)
- **Webhooks** — Custom HTTP callbacks

### Setup Telegram

**Prerequisites:**
1. Go to Telegram, find **@BotFather**
2. Send `/newbot` command
3. Name your bot (e.g., "ServiceOps Alerts Bot")
4. Copy **bot token** (looks like: `123456789:ABCdef...`)
5. Create private group or channel
6. Add bot to group/channel
7. Get **chat ID** (use @getidsbot or API)

**ServiceOps Setup:**
1. Go to **Notifications** page
2. Click **+ New Channel**
3. Fill in:
   - **Name:** "Telegram Alerts"
   - **Type:** Telegram
   - **Bot Token:** paste token
   - **Chat ID:** paste chat ID (with minus sign if group)
4. Click **Test** button (verifies message delivery)
5. Check Telegram for test message
6. Click **Save**

### Setup Email

**Gmail Example:**
1. Go to **Notifications** page
2. Click **+ New Channel**
3. Fill in:
   - **Name:** "Email Alerts"
   - **Type:** Email
   - **SMTP Host:** smtp.gmail.com
   - **Port:** 587
   - **User:** your-email@gmail.com
   - **Password:** app-specific password (NOT Gmail password)
   - **From Address:** noreply@serviceops.local
4. Click **Test**
5. Check inbox
6. Click **Save**

**Generate Gmail App Password:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Search "App passwords"
4. Generate password for "Mail"
5. Copy 16-character password

### Setup Discord

**Prerequisites:**
1. Go to Discord server → Server Settings
2. Integrations → Webhooks
3. Click **New Webhook**
4. Name it "ServiceOps Alerts"
5. Select channel
6. Copy webhook URL

**ServiceOps Setup:**
1. Notifications page → **+ New Channel**
2. Type: **Discord**
3. Webhook URL: paste URL
4. Test → Save

### Test Channel

1. Click channel row in table
2. Click **Test** button
3. Verify message arrives in destination
4. Check status: **sent** or **failed**

### View Channel Logs

1. Click channel row
2. Click **Logs** tab
3. See delivery history:
   - **Status:** sent/failed/pending
   - **Timestamp:** when sent
   - **Payload:** message content
   - **Response:** API response

---

## SLA Tracking

### What is SLA?

Service Level Agreement — committed uptime target.

**Common Targets:**
- **99%** = 7 hours 20 minutes downtime/month
- **99.9%** = 43 minutes 50 seconds downtime/month  
- **99.99%** = 4 minutes 23 seconds downtime/month
- **99.999%** = 26 seconds downtime/month

### Create SLA Target

**Steps:**
1. Go to **SLA** page
2. Click **+ New Target**
3. Fill in:
   - **Asset:** Select asset (e.g., Production API)
   - **Target Uptime:** 99.9%
   - **Reporting Period:** Monthly (or Quarterly)
4. Click **Save**

**Result:** System tracks actual uptime vs. target.

### View Uptime Report

**SLA Page Shows:**
- Asset name
- **Current uptime %** (e.g., 99.95%)
- **Downtime minutes** (e.g., 7.2 minutes)
- **vs. Target** (✅ Pass or ❌ Fail)
- **Last incident** timestamp

**Report Generation:**
- Auto-generated monthly
- Shows trend chart
- Exportable as CSV

### How Downtime is Calculated

**Formula:**
```
Downtime = Sum of incident durations
Duration = resolved_time - created_time
```

**Only counted:**
- Incidents marked **Resolved**
- Incidents with severity >= warning

**Not counted:**
- Acknowledged but not resolved
- Informational incidents

**Example:**
- Incident A: 10:00 → 10:30 (30 minutes)
- Incident B: 14:00 → 14:20 (20 minutes)
- **Total downtime:** 50 minutes
- **Monthly uptime:** (43200 - 50) / 43200 = 99.88%

