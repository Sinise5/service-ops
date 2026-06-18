# ServiceOps Integration Guide - Complete Setup

## Overview

This guide shows **step-by-step** how to set up ServiceOps from scratch with **complete integration** from assets to Telegram notifications.

---

## Architecture Overview

```
Assets → Monitoring Checks → Alert Rules → Incidents → Notifications
```

**Flow:**
1. **Assets** — Your infrastructure (servers, APIs, databases)
2. **Monitoring Checks** — HTTP/Ping/SSL/TCP checks (run every 30s)
3. **Alert Rules** — Conditions that trigger alerts
4. **Incidents** — Created when alert rules trigger
5. **Notifications** — Sent to Telegram/Discord/Email

---

## Part 1: Database Migration (REQUIRED for existing installations)

If you already have ServiceOps running with the old schema, you MUST migrate before using flexible alert rules.

### Option A: Drop & Recreate (Development Only)

**⚠️ WARNING: Deletes all data!**

```bash
cd ~/service-ops
docker compose down -v  # Delete volumes
docker compose up -d --build
```

**Result:** Fresh database with new schema (conditions + logic columns)

---

### Option B: Migrate Existing Database (Production Safe)

**Step 1: Copy migration file to container**
```bash
cd ~/service-ops
docker cp migrate_alert_rules.sql serviceops-db-1:/tmp/
```

**Step 2: Run migration**
```bash
docker exec -it serviceops-db-1 psql -U serviceops -d serviceops -f /tmp/migrate_alert_rules.sql
```

**Step 3: Verify migration**
```bash
docker exec -it serviceops-db-1 psql -U serviceops -d serviceops -c "\\d alert_rules"
```

**Expected columns:**
- id
- check_id
- name
- condition (nullable)
- threshold
- **conditions** (JSONB, new)
- **logic** (VARCHAR, new)
- severity
- enabled

---

## Part 2: Complete Setup (Step-by-Step)

### Step 1: Login

1. Open browser: `http://10.10.10.201:5173`
2. Login:
   - Email: `admin@serviceops.local`
   - Password: `admin123`

---

### Step 2: Create Asset

**Navigation:** Assets → Create

**Example 1: Web Server**
```
Name: Production Web Server
Type: Server
Description: Main production web server
Status: active
Environment: production
```

**Example 2: API Service**
```
Name: User API
Type: API
Description: User authentication API
Status: active
Environment: production
```

---

### Step 3: Create Monitoring Check

**Navigation:** Monitoring → Create

**Example 1: HTTP Health Check**
```
Asset: Production Web Server
Name: Health Endpoint Check
Type: HTTP
Config:
  URL: http://localhost:9080/health
  Method: GET
  Expected Status: 200
  Timeout: 5 seconds
Interval: 30 seconds
Enabled: Yes
```

**Example 2: Ping Check**
```
Asset: Production Web Server
Name: Server Connectivity
Type: Ping
Config:
  Host: 10.10.10.201
  Count: 4
  Timeout: 5 seconds
Interval: 60 seconds
Enabled: Yes
```

**Result:** Check executes automatically after creation. Click "View Logs" to see execution history.

---

### Step 4: Create Notification Channel

**Navigation:** Notifications → Channels → Create

**Example: Telegram Channel**
```
Name: Production Alerts
Type: telegram
Config:
  bot_token: YOUR_BOT_TOKEN
  chat_id: -1004296018288
Enabled: Yes
```

**How to get Telegram credentials:**

1. **Create bot:**
   - Message @BotFather on Telegram
   - Send `/newbot`
   - Follow instructions
   - Copy bot token (e.g., `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Get chat_id:**
   - Add bot to your group/channel
   - Send a message in the group
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find `"chat":{"id":-1001234567890}` in response
   - Copy chat_id (negative number for groups/channels)

**Example: Discord Webhook**
```
Name: Discord Alerts
Type: discord
Config:
  webhook_url: https://discord.com/api/webhooks/...
Enabled: Yes
```

**How to get Discord webhook:**
1. Open Discord server settings
2. Integrations → Webhooks → New Webhook
3. Copy webhook URL

---

### Step 5: Create Alert Rule (Simple)

**Navigation:** Alerts → Rules → Create

**Example 1: Response Time Alert (Legacy Single Condition)**
```
Check: Health Endpoint Check
Name: Slow Response Alert
Condition: threshold_exceeded
Threshold: 1000 (milliseconds)
Severity: warning
Enabled: Yes
```

**Result:** Alert triggers when response time > 1000ms

---

### Step 6: Create Alert Rule (Advanced Multi-Condition)

**Example 2: Complex Alert**
```
Check: Health Endpoint Check
Name: Critical Service Issue
Conditions: (leave empty for simple rules)
  Condition 1:
    Field: response_time_ms
    Operator: >
    Value: 5000
  
  Condition 2:
    Field: status
    Operator: ==
    Value: failed

Logic: OR

Severity: critical
Enabled: Yes
```

**Result:** Alert triggers if response_time > 5000ms OR status == failed

---

### Step 7: Link Alert Rule to Notification Channel

**Navigation:** Alerts → Notifications → Create

```
Rule: Slow Response Alert
Channel: Production Alerts (Telegram)
```

**Result:** When alert triggers → incident created → Telegram notification sent

---

## Part 3: Verification & Testing

### Test 1: Verify Monitoring Check Works

1. Go to **Monitoring** page
2. Find your check
3. Click **"Execute Now"** button
4. Click **"View Logs"** button
5. Verify latest log shows **success** with response time

**Expected result:**
```
6/18/2026, 10:23:18 PM
success • 45.23ms
```

---

### Test 2: Trigger Alert Manually

**Option A: Use unreachable target**
```
Create HTTP check:
  URL: http://192.168.255.255/  (unreachable IP)
  Timeout: 5 seconds

Create alert rule:
  Condition: check_failed
  Severity: warning

Link to Telegram channel
```

**Result:** Check fails → Alert triggers → Incident created → Telegram notification sent

---

**Option B: Use low threshold**
```
Create alert rule:
  Condition: threshold_exceeded
  Threshold: 1 (1 millisecond - impossible to meet)

Link to Telegram channel
```

**Result:** Any successful check with response time >1ms → Alert triggers

---

### Test 3: Verify Telegram Notification

1. Trigger alert (using above methods)
2. Wait 30-60 seconds (scheduler runs every 30s)
3. Check Telegram group/channel
4. Verify message received:

```
🚨 Alert: Slow Response Alert
Severity: warning
Check Type: http
Status: failed
Error: Connection timeout
```

---

## Part 4: Flexible Alert Rules (Advanced)

### Available Fields

| Field | Type | Description | Example Values |
|-------|------|-------------|----------------|
| `response_time_ms` | number | Response time in milliseconds | 45.23, 1023.5 |
| `status` | string | Check execution status | success, failure, warning |
| `output` | string | Check output message | "HTTP 200", "Loss: 0%" |

---

### Available Operators

| Operator | Type | Description | Example |
|----------|------|-------------|---------|
| `>` | number | Greater than | response_time_ms > 1000 |
| `<` | number | Less than | response_time_ms < 50 |
| `>=` | number | Greater or equal | response_time_ms >= 500 |
| `<=` | number | Less or equal | response_time_ms <= 2000 |
| `==` | any | Equals | status == "failed" |
| `!=` | any | Not equals | status != "success" |

---

### Logic Operators

| Logic | Description | Example |
|-------|-------------|---------|
| `AND` | All conditions must be true | Slow AND failed |
| `OR` | At least one condition true | Slow OR failed |

---

### Example Rules

**Example 1: High Response Time AND Failed Status**
```json
{
  "conditions": [
    {"field": "response_time_ms", "operator": ">", "value": 5000},
    {"field": "status", "operator": "==", "value": "failed"}
  ],
  "logic": "AND"
}
```

**Triggers when:** Response time > 5000ms AND status is failed

---

**Example 2: Critical Performance Degradation (OR)**
```json
{
  "conditions": [
    {"field": "response_time_ms", "operator": ">", "value": 10000},
    {"field": "status", "operator": "==", "value": "failed"}
  ],
  "logic": "OR"
}
```

**Triggers when:** Response time > 10000ms OR status is failed

---

**Example 3: Acceptable Range (Combined)**
```json
{
  "conditions": [
    {"field": "response_time_ms", "operator": "<", "value": 50},
    {"field": "response_time_ms", "operator": ">", "value": 5}
  ],
  "logic": "AND"
}
```

**Triggers when:** Response time between 5-50ms (inverted alert — alerts when performance is TOO good, useful for detecting caching issues)

---

## Part 5: Troubleshooting

### Issue 1: "conditions column does not exist" Error

**Symptom:**
```
400 Bad Request
column "conditions" of relation "alert_rules" does not exist
```

**Solution:** Run database migration (see Part 1)

---

### Issue 2: No Telegram Notifications

**Checklist:**
1. ✅ Notification channel created and enabled
2. ✅ Alert rule created and enabled
3. ✅ Alert rule linked to channel (alert_notifications table)
4. ✅ Alert rule actually triggering (check Incidents page)
5. ✅ Bot token correct
6. ✅ Chat ID correct (negative for groups)
7. ✅ Bot added to group/channel
8. ✅ Bot has permission to send messages

**Debug:**
```bash
# Test bot token manually
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Test sending message
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message"
```

---

### Issue 3: Monitoring Check Always Fails

**See:** MONITORING_GUIDE.md for detailed troubleshooting

**Common causes:**
- Unreachable target (private IP, firewall)
- Wrong URL/protocol (HTTP vs HTTPS)
- Timeout too short
- Network connectivity issues

---

### Issue 4: Alert Triggers But No Incident Created

**Diagnosis:**
1. Check `/logs` page for errors
2. Verify alert rule enabled
3. Verify check_id matches monitoring check
4. Check database manually:
   ```sql
   SELECT * FROM alert_incidents WHERE rule_id = '<YOUR_RULE_ID>';
   ```

---

## Part 6: Best Practices

### 1. Start Simple, Then Advanced

**Phase 1:** Use legacy single-condition rules
```
Condition: threshold_exceeded
Threshold: 1000
```

**Phase 2:** Migrate to multi-condition rules when needed
```
Conditions: [
  {field: "response_time_ms", operator: ">", value: 1000}
]
Logic: AND
```

---

### 2. Use Descriptive Names

**❌ Bad:**
```
Alert 1
Check 2
Channel 3
```

**✅ Good:**
```
Production API Slow Response Alert
User Service Health Check
DevOps Telegram Channel
```

---

### 3. Set Appropriate Severity Levels

| Severity | Use Case | Example |
|----------|----------|---------|
| `info` | Informational only | Backup completed |
| `warning` | Non-critical issues | Response time > 1s |
| `error` | Service degradation | Response time > 5s |
| `critical` | Service down | Check failed |

---

### 4. Group Notifications by Environment

**Setup:**
- Production Alerts → Telegram Channel A
- Staging Alerts → Telegram Channel B
- Development Alerts → Discord Webhook

**Result:** Different teams see relevant alerts only

---

### 5. Test Before Production

1. Create test asset
2. Create test monitoring check (use google.com)
3. Create test alert rule (threshold: 1ms)
4. Link to test Telegram group
5. Verify notification received
6. Delete test resources
7. Deploy to production

---

## Contact & Support

For issues:
1. Check MONITORING_GUIDE.md for monitoring setup
2. Check ALERT_RULES_GUIDE.md for alert rules details
3. Check this guide for integration flow
4. Check ServiceOps logs: `/logs` page
5. Contact: admin@serviceops.local

---

## Quick Reference

**Default credentials:**
- Email: admin@serviceops.local
- Password: admin123

**Scheduler interval:** 30 seconds

**Database migration:** `migrate_alert_rules.sql`

**Documentation:**
- MONITORING_GUIDE.md — Monitoring setup
- ALERT_RULES_GUIDE.md — Alert rules reference
- INTEGRATION_GUIDE.md — This file (end-to-end setup)
