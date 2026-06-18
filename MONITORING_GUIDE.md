# Monitoring Setup Guide - Comprehensive Tutorial

## Overview

ServiceOps monitoring lets you track availability, performance, and health of your infrastructure. This guide shows **the correct way** to set up assets, monitoring checks, and troubleshoot issues.

---

## Quick Start Checklist

✅ **Step 1:** Create Asset (server, API, database)  
✅ **Step 2:** Create Monitoring Check (HTTP, Ping, SSL, TCP)  
✅ **Step 3:** Verify check executes successfully  
✅ **Step 4:** Create Alert Rule (optional)  
✅ **Step 5:** Set up Notifications (Telegram, Discord, Email)  
✅ **Step 6:** Link Alert Rule to Notification Channel  

---

## End-to-End Integration Flow

### How Everything Connects

ServiceOps automatically integrates all modules. Here's the complete flow:

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPLETE FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. CREATE ASSET
   └─> Server, API, Database, Infrastructure
   
2. CREATE MONITORING CHECK (attached to asset)
   └─> HTTP, Ping, SSL, TCP
   └─> Executes automatically every 30-300 seconds
   └─> Result saved to monitoring_results table
   
3. CREATE ALERT RULE (attached to check)
   └─> Single condition: "threshold_exceeded", "check_failed"
   └─> OR Multi-condition: response_time > 1000 AND status == "failed"
   └─> Evaluated automatically after each check execution
   
4. IF ALERT TRIGGERS → CREATE INCIDENT
   └─> Incident record created in alert_incidents table
   └─> Status: open
   └─> Severity: info/warning/critical
   
5. SEND NOTIFICATIONS (if channel linked)
   └─> Telegram message
   └─> Discord webhook
   └─> Email alert
   
6. USER ACKNOWLEDGES/RESOLVES INCIDENT
   └─> Mark as acknowledged (team aware)
   └─> Mark as resolved (issue fixed)
```

### Key Points

✅ **Automatic execution** — Scheduler runs every 30 seconds, checks due monitoring checks  
✅ **Automatic evaluation** — Alert rules evaluated after each check execution  
✅ **Automatic notification** — Telegram/Discord/Email sent immediately when alert triggers  
✅ **No manual trigger needed** — Everything happens automatically once configured  

### What You Need to Setup

**Mandatory:**
1. ✅ Asset
2. ✅ Monitoring Check

**Optional (for alerts):**
3. ✅ Alert Rule
4. ✅ Notification Channel
5. ✅ **Link Alert Rule → Notification Channel** (IMPORTANT!)

---

## Part 0: Complete Setup Example (Start to Finish)

### Scenario: Monitor Production API with Telegram Alerts

**Step 1: Create Asset**
```
Go to: Assets page
Click: + New Asset
Fill:
  Name: Production API
  Type: API
  Description: Main REST API for user services
  Status: active
Save
```

**Step 2: Create Monitoring Check**
```
Go to: Monitoring page
Click: + New Check
Fill:
  Name: API Health Check
  Asset: Production API (select from dropdown)
  Type: HTTP
  URL: https://api.example.com/health
  Method: GET
  Expected Status: 200
  Interval: 60 seconds
  Timeout: 10 seconds
Save
```

**Result:** Check runs automatically every 60 seconds

**Step 3: Verify Check Execution**
```
Go to: Monitoring page
Find: API Health Check row
Click: "Logs" button
See: Execution history with timestamps, status, response time
Expected: success • 50-200ms
```

**Step 4: Create Alert Rule**
```
Go to: Alerts page
Click: + Add Alert Rule
Fill:
  Name: API Slow or Failed
  Check: API Health Check (select from dropdown)
  
  Legacy (simple):
    Condition: Threshold Exceeded
    Threshold: 1000 (ms)
  
  OR Advanced (multi-condition):
    Click: + Add (condition)
    Condition 1: response_time_ms > 1000
    Condition 2: status == "failed"
    Logic: OR
  
  Severity: Critical
  Enabled: ✓
Save
```

**Step 5: Setup Telegram Notification**

**5a. Get Telegram Bot Token**
```
1. Open Telegram
2. Search: @BotFather
3. Send: /newbot
4. Follow prompts, get token: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**5b. Get Chat ID**
```
Option A (Group):
1. Create Telegram group
2. Add bot to group
3. Send test message
4. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
5. Find "chat":{"id": -1001234567890}
6. Copy chat ID: -1001234567890

Option B (Private):
1. Start chat with bot
2. Send any message
3. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
4. Find "chat":{"id": 123456789}
5. Copy chat ID: 123456789
```

**5c. Create Channel in ServiceOps**
```
Go to: Notifications page
Click: + New Channel
Fill:
  Name: Telegram Production Alerts
  Type: Telegram
  Bot Token: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
  Chat ID: -1001234567890
  Enabled: ✓
Click: Test (verify message received)
Save
```

**Step 6: Link Alert Rule to Notification Channel** ⚠️ **CRITICAL STEP**

```
Go to: Alerts page
Find: API Slow or Failed (your rule)
Click: Edit
Scroll: Notification Channels section
Check: ✓ Telegram Production Alerts
Save
```

**Result:** When alert triggers → Telegram notification sent automatically

---

## How Scheduler Works (Behind the Scenes)

### Automatic Execution Cycle

```
Every 30 seconds:

1. Scheduler queries monitoring_checks table
2. Find checks where: enabled=true AND (last_executed + interval < now)
3. For each due check:
   a. Execute check (HTTP/Ping/SSL/TCP plugin)
   b. Save result to monitoring_results
   c. JOIN alert_rules WHERE check_id = current_check
   d. Evaluate alert conditions
   e. IF triggered:
      - Check if incident already open for this rule
      - IF not open: CREATE incident in alert_incidents
      - Query alert_notifications table for linked channels
      - Send notification to each linked channel
4. Sleep 30 seconds
5. Repeat
```

### Database Tables Involved

```
monitoring_checks           ← Checks to execute
    ↓
monitoring_results          ← Execution history/logs
    ↓
alert_rules                 ← Conditions to evaluate
    ↓
alert_incidents             ← Triggered alerts (open/acknowledged/resolved)
    ↓
alert_notifications         ← Link: rule_id → channel_id (MANY-TO-MANY)
    ↓
notification_channels       ← Telegram/Discord/Email config
    ↓
[External: Telegram/Discord/SMTP]
```

### Why Step 6 (Linking) is Critical

**Without linking** (alert_notifications table empty):
- ✅ Check executes
- ✅ Alert rule evaluates
- ✅ Incident created
- ❌ **NO notification sent** (no channels linked!)

**With linking** (alert_notifications has rule_id + channel_id):
- ✅ Check executes
- ✅ Alert rule evaluates
- ✅ Incident created
- ✅ **Notification sent to all linked channels**

---

## Part 1: Asset Management

### What is an Asset?

An asset is any IT resource you want to monitor:
- **Servers** — Web servers, app servers, VMs
- **APIs** — REST endpoints, GraphQL, webhooks
- **Databases** — PostgreSQL, MySQL, Redis, MongoDB
- **Infrastructure** — Load balancers, caches, queues
- **Websites** — Public websites, internal portals

### Create Your First Asset

**Example 1: Web Server**
```
Name: Production Web Server
Type: Server
Description: Main web server serving example.com
Status: active
Environment: production
```

**Example 2: REST API**
```
Name: User Service API
Type: API
Description: User authentication and profile API
Status: active
Environment: production
```

**Example 3: Database**
```
Name: PostgreSQL Primary
Type: Database
Description: Main PostgreSQL database
Status: active
Environment: production
```

### Asset Best Practices

1. **Use descriptive names** — "Production API Gateway" not "server1"
2. **Set correct type** — helps filtering and organization
3. **Add environment** — production, staging, development
4. **Write useful descriptions** — what the asset does, who owns it

---

## Part 2: Monitoring Checks

### Check Types

| Type | Use Case | Target Format | Example |
|------|----------|---------------|---------|
| **HTTP** | Web servers, APIs, endpoints | URL | `http://api.example.com/health` |
| **Ping** | Server connectivity | IP or hostname | `10.7.0.19` or `server.local` |
| **SSL** | Certificate expiry | Domain:port | `example.com:443` |
| **TCP** | Port availability | IP:port | `10.7.0.19:5432` |

---

## Part 3: HTTP Monitoring (Most Common)

### Example 1: Monitor Public Website

**✅ CORRECT:**
```
Name: Google Homepage Check
Type: HTTP
URL: https://www.google.com
Method: GET
Expected Status: 200
Interval: 60 seconds
Timeout: 10 seconds
```

**Result:** ✅ Success, ~50-200ms response time

**Why it works:**
- URL is reachable from your server
- HTTPS protocol correct
- Status 200 expected and returned

---

### Example 2: Monitor Internal API

**✅ CORRECT:**
```
Name: Health Check Endpoint
Type: HTTP
URL: http://localhost:9080/health
Method: GET
Expected Status: 200
Interval: 30 seconds
Timeout: 5 seconds
```

**Result:** ✅ Success if backend running

**Why it works:**
- localhost always reachable if service running
- Health endpoint usually fast (<100ms)
- Timeout 5s sufficient for local service

---

### Example 3: Monitor External API

**✅ CORRECT:**
```
Name: JSONPlaceholder API
Type: HTTP
URL: https://jsonplaceholder.typicode.com/posts/1
Method: GET
Expected Status: 200
Interval: 120 seconds
Timeout: 10 seconds
```

**Result:** ✅ Success, public test API always available

---

### Common HTTP Mistakes

**❌ WRONG: Unreachable Private IP from Public Internet**
```
URL: http://10.7.0.19/
```
**Problem:** `10.7.0.19` is private IP. If ServiceOps runs outside that network, it cannot reach it.

**✅ FIX:**
- Use public IP or domain: `http://example.com`
- Or deploy ServiceOps inside same network as target
- Or use VPN/tunnel to reach private network

---

**❌ WRONG: Wrong Protocol**
```
URL: http://github.com
```
**Problem:** GitHub forces HTTPS redirect. HTTP request redirects, may timeout.

**✅ FIX:**
```
URL: https://github.com
```

---

**❌ WRONG: Missing Endpoint**
```
URL: http://localhost
```
**Problem:** Root path may not exist or require authentication.

**✅ FIX:**
```
URL: http://localhost/health
URL: http://localhost/api/status
```
Use specific health/status endpoint that returns 200.

---

**❌ WRONG: Firewall Blocking**
```
URL: http://internal-server:8080/api
```
**Problem:** Port 8080 blocked by firewall.

**✅ FIX:**
- Check firewall rules allow traffic from ServiceOps server
- Test with `curl http://internal-server:8080/api` from same server
- Open firewall port if needed

---

## Part 4: Ping Monitoring

### Example 1: Monitor Server Connectivity

**✅ CORRECT:**
```
Name: Database Server Ping
Type: Ping
Host: 10.10.10.20
Count: 4 packets
Timeout: 5 seconds
Interval: 60 seconds
```

**Result:** ✅ Success, <50ms response time

**Why it works:**
- Host is on same network
- ICMP (ping) not blocked by firewall
- Host responds to ping

---

### Example 2: Monitor Public DNS

**✅ CORRECT:**
```
Name: Cloudflare DNS Check
Type: Ping
Host: 1.1.1.1
Count: 4
Timeout: 5 seconds
Interval: 300 seconds
```

**Result:** ✅ Success, ~10-30ms

---

### Common Ping Mistakes

**❌ WRONG: Hostname that doesn't resolve**
```
Host: my-server.internal
```
**Problem:** DNS cannot resolve `my-server.internal`

**✅ FIX:**
- Use IP address: `10.7.0.19`
- Or ensure DNS configured correctly
- Test: `ping my-server.internal` from ServiceOps server

---

**❌ WRONG: ICMP blocked by firewall**
```
Host: 192.168.1.100
```
**Problem:** Target server firewall drops ICMP packets.

**✅ FIX:**
- Enable ICMP in firewall rules
- Or use TCP/HTTP check instead (port-based)

---

## Part 5: SSL Certificate Monitoring

### Example: Monitor Certificate Expiry

**✅ CORRECT:**
```
Name: Main Website SSL
Type: SSL
Host: example.com
Port: 443
Warning Threshold: 30 days
Interval: 86400 seconds (daily)
```

**Result:** ✅ Success, shows days until expiry

**Why it works:**
- Domain accessible from ServiceOps
- Port 443 (HTTPS) open
- Certificate valid

---

## Part 6: TCP Port Monitoring

### Example 1: Monitor Database Port

**✅ CORRECT:**
```
Name: PostgreSQL Port Check
Type: TCP
Host: 10.10.10.20
Port: 5432
Timeout: 5 seconds
Interval: 60 seconds
```

**Result:** ✅ Success if port open

---

### Example 2: Monitor Redis

**✅ CORRECT:**
```
Name: Redis Port Check
Type: TCP
Host: localhost
Port: 6379
Timeout: 3 seconds
Interval: 30 seconds
```

---

## Part 7: Troubleshooting

### Issue 1: Check Always Fails with 10+ Second Timeout

**Symptom:**
```
failure • 10021.952152252197ms
failure • 10023.004055023193ms
```

**Diagnosis:**
- Response time ~10 seconds = timeout hit
- Target unreachable or too slow

**Solutions:**
1. **Verify target reachable manually:**
   ```bash
   # For HTTP:
   curl -v http://10.7.0.19/ --max-time 10
   
   # For Ping:
   ping -c 4 10.7.0.19
   
   # For TCP:
   telnet 10.7.0.19 80
   ```

2. **Check network connectivity:**
   - Is target on same network?
   - Is firewall blocking?
   - Is VPN required?

3. **Use public target for testing:**
   ```
   HTTP: https://www.google.com
   Ping: 8.8.8.8
   ```

4. **Increase timeout if target genuinely slow:**
   - Change timeout from 10s → 30s
   - But investigate why target is slow

---

### Issue 2: Check Shows No Results

**Symptom:** Created check but no execution logs appear

**Solutions:**
1. **Wait 30-60 seconds** — scheduler runs every 30s
2. **Check backend health:**
   ```bash
   curl http://localhost:9080/health
   ```
3. **Check check is enabled** — Status column shows "Enabled"
4. **Click "Execute Now"** — test immediately instead of waiting

---

### Issue 3: SSL Check Fails

**Symptom:** SSL certificate check always fails

**Solutions:**
1. **Verify domain accessible:**
   ```bash
   openssl s_client -connect example.com:443 -servername example.com
   ```
2. **Check port is 443** (HTTPS)
3. **Use domain name not IP** — SSL requires SNI (Server Name Indication)

---

### Issue 4: Ping Works But HTTP Fails

**Symptom:** 
- Ping check: ✅ Success
- HTTP check to same host: ❌ Failure

**Diagnosis:**
- Host reachable but web server down
- Or firewall allows ICMP but blocks HTTP port

**Solutions:**
1. **Check web server running:**
   ```bash
   ssh user@10.7.0.19
   systemctl status nginx  # or apache2, etc.
   ```
2. **Check firewall allows HTTP:**
   ```bash
   sudo ufw status
   sudo firewall-cmd --list-all
   ```
3. **Test from ServiceOps server:**
   ```bash
   curl -v http://10.7.0.19/
   ```

---

## Part 8: Best Practices

### 1. Start with Public Targets for Testing

Before monitoring internal infrastructure, verify monitoring works:
- ✅ `https://www.google.com`
- ✅ `https://httpbin.org/status/200`
- ✅ Ping `8.8.8.8` (Google DNS)

If these work → monitoring code OK, your target is the issue  
If these fail → investigate ServiceOps network/config

---

### 2. Use Health Endpoints for HTTP

Don't monitor homepage/login page. Use dedicated health endpoints:
- ✅ `/health`
- ✅ `/api/status`
- ✅ `/ping`
- ✅ `/actuator/health` (Spring Boot)

---

### 3. Set Appropriate Intervals

| Check Type | Recommended Interval |
|------------|---------------------|
| Critical API | 30-60 seconds |
| Website | 60-120 seconds |
| Database | 60 seconds |
| SSL Certificate | Daily (86400s) |

---

### 4. Set Realistic Timeouts

| Check Type | Recommended Timeout |
|------------|-------------------|
| HTTP (local) | 5 seconds |
| HTTP (external) | 10 seconds |
| Ping | 5 seconds |
| TCP | 3 seconds |

---

### 5. Group Related Checks

Create assets first, then checks for each asset:
```
Asset: Production API Gateway
├── HTTP Check: /health endpoint
├── TCP Check: Port 443
└── SSL Check: Certificate expiry
```

---

## Contact & Support

For issues:
1. Check this guide first
2. Check ALERT_RULES_GUIDE.md for alert setup
3. Test manually with curl/ping/telnet
4. Check ServiceOps logs for errors
5. Contact admin@serviceops.local
